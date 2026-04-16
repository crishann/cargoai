const express = require("express");
const jwt = require("jsonwebtoken");
const { getPool, initDatabase } = require("./db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const ALLOWED_STATUS_UPDATES = new Set(["confirmed", "cancelled"]);

function isDatabaseUnavailableError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  return (
    code === "EACCES" ||
    code === "ETIMEDOUT" ||
    message.includes("database not initialized") ||
    message.includes("database unavailable") ||
    message.includes("connection timeout") ||
    message.includes("connection terminated") ||
    message.includes("connect timeout") ||
    message.includes("timed out")
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "missing auth token" });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "invalid auth token" });
  }
}

async function getOwnerIdByUserId(pool, userId) {
  const [rows] = await pool.query(
    "SELECT owner_id FROM car_owners WHERE user_id = ? LIMIT 1",
    [userId]
  );

  return rows[0]?.owner_id || null;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         b.booking_id,
         b.start_date,
         b.end_date,
         b.pickup_location,
         b.dropoff_location,
         b.total_cost,
         COALESCE(b.status, 'pending') AS booking_status,
         b.created_at,
         v.vehicle_id,
         v.brand,
         v.model,
         v.year,
         v.plate_number,
         r.renter_id,
         u.username AS renter_username,
         u.email AS renter_email,
         p.payment_id,
         p.method AS payment_method,
         p.amount AS payment_amount,
         COALESCE(p.status, 'pending') AS payment_status,
         p.paid_at
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       INNER JOIN \`user\` u ON u.user_id = r.user_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       WHERE v.owner_id = ?
       ORDER BY
         CASE COALESCE(b.status, 'pending')
           WHEN 'pending' THEN 0
           WHEN 'confirmed' THEN 1
           WHEN 'ongoing' THEN 2
           WHEN 'completed' THEN 3
           WHEN 'cancelled' THEN 4
           ELSE 5
         END,
         b.created_at DESC,
         b.booking_id DESC`,
      [ownerId]
    );

    return res.json({
      ownerId,
      bookings: rows.map((row) => ({
        bookingId: row.booking_id,
        renterId: row.renter_id,
        renterName: row.renter_username,
        renterEmail: row.renter_email,
        vehicleId: row.vehicle_id,
        vehicleLabel: `${row.brand} ${row.model}`.trim(),
        year: row.year,
        plateNumber: row.plate_number,
        startDate: row.start_date,
        endDate: row.end_date,
        pickupLocation: row.pickup_location,
        dropoffLocation: row.dropoff_location,
        totalCost: Number(row.total_cost),
        bookingStatus: row.booking_status,
        createdAt: row.created_at,
        payment: row.payment_id
          ? {
              paymentId: row.payment_id,
              method: row.payment_method,
              amount: Number(row.payment_amount),
              status: row.payment_status,
              paidAt: row.paid_at,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Owner bookings error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/:bookingId/status", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const nextStatus = String(req.body?.status || "").trim().toLowerCase();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  if (!ALLOWED_STATUS_UPDATES.has(nextStatus)) {
    return res.status(400).json({ message: "status must be confirmed or cancelled" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         b.booking_id,
         COALESCE(b.status, 'pending') AS booking_status
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE b.booking_id = ?
         AND v.owner_id = ?
       LIMIT 1`,
      [bookingId, ownerId]
    );

    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (booking.booking_status !== "pending") {
      return res.status(409).json({ message: "only pending bookings can be updated" });
    }

    await pool.query("UPDATE bookings SET status = ? WHERE booking_id = ?", [nextStatus, bookingId]);

    return res.json({
      message: `booking ${nextStatus}`,
      booking: {
        bookingId,
        status: nextStatus,
      },
    });
  } catch (error) {
    console.error("Owner booking status update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/:bookingId/payment-status", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const nextStatus = String(req.body?.status || "").trim().toLowerCase();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  if (nextStatus !== "paid") {
    return res.status(400).json({ message: "payment status must be paid" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         p.payment_id,
         COALESCE(p.status, 'pending') AS payment_status
       FROM payments p
       INNER JOIN bookings b ON b.booking_id = p.booking_id
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE p.booking_id = ?
         AND v.owner_id = ?
       LIMIT 1`,
      [bookingId, ownerId]
    );

    const payment = rows[0];
    if (!payment) {
      return res.status(404).json({ message: "payment not found for this booking" });
    }

    if (payment.payment_status === "paid") {
      return res.status(409).json({ message: "payment is already marked as paid" });
    }

    await pool.query("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE payment_id = ?", [payment.payment_id]);

    return res.json({
      message: "payment marked as paid",
      payment: {
        paymentId: payment.payment_id,
        bookingId,
        status: "paid",
      },
    });
  } catch (error) {
    console.error("Owner payment status update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
