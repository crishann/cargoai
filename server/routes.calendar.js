const express = require("express");
const jwt = require("jsonwebtoken");
const { getPool, initDatabase } = require("./db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

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
  const monthParam = String(req.query.month || "");
  const normalizedMonth = /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : new Date().toISOString().slice(0, 7);
  const monthStart = `${normalizedMonth}-01 00:00:00`;
  const [year, month] = normalizedMonth.split("-").map(Number);
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEnd = `${nextMonth}-01 00:00:00`;

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [bookingRows] = await pool.query(
      `SELECT
         b.booking_id,
         b.start_date,
         b.end_date,
         b.pickup_location,
         b.dropoff_location,
         b.total_cost,
         COALESCE(b.status, 'pending') AS status,
         v.vehicle_id,
         v.brand,
         v.model,
         r.renter_id,
         u.username AS renter_username
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       INNER JOIN \`user\` u ON u.user_id = r.user_id
       WHERE v.owner_id = ?
         AND b.start_date < ?
         AND b.end_date >= ?
       ORDER BY b.start_date ASC, b.booking_id ASC`,
      [ownerId, monthEnd, monthStart]
    );

    const [blockoutRows] = await pool.query(
      `SELECT
         vb.blockout_id,
         vb.start_date,
         vb.end_date,
         vb.reason,
         v.vehicle_id,
         v.brand,
         v.model
       FROM vehicle_blockouts vb
       INNER JOIN vehicles v ON v.vehicle_id = vb.vehicle_id
       WHERE v.owner_id = ?
         AND vb.start_date < ?
         AND vb.end_date >= ?
       ORDER BY vb.start_date ASC, vb.blockout_id ASC`,
      [ownerId, monthEnd, monthStart]
    );

    return res.json({
      month: normalizedMonth,
      bookings: bookingRows.map((row) => ({
        bookingId: row.booking_id,
        vehicleId: row.vehicle_id,
        vehicleLabel: `${row.brand} ${row.model}`.trim(),
        renterId: row.renter_id,
        renterName: row.renter_username,
        startDate: row.start_date,
        endDate: row.end_date,
        pickupLocation: row.pickup_location,
        dropoffLocation: row.dropoff_location,
        totalCost: Number(row.total_cost),
        status: row.status,
      })),
      blockouts: blockoutRows.map((row) => ({
        blockoutId: row.blockout_id,
        vehicleId: row.vehicle_id,
        vehicleLabel: `${row.brand} ${row.model}`.trim(),
        startDate: row.start_date,
        endDate: row.end_date,
        reason: row.reason || "Owner blockout",
      })),
    });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
