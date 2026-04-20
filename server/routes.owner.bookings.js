const express = require("express");
const jwt = require("jsonwebtoken");
const { getPool, initDatabase } = require("./db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const ALLOWED_STATUS_UPDATES = new Set(["confirmed", "cancelled"]);

function buildInvoiceNumber(invoiceId) {
  return `INV-${String(invoiceId).padStart(6, "0")}`;
}

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

async function syncCompletedBookings(pool) {
  const [rows] = await pool.query(
    `SELECT booking_id, COALESCE(status, 'pending') AS booking_status
     FROM bookings
     WHERE COALESCE(status, 'pending') IN ('confirmed', 'ongoing')
       AND end_date < NOW()`
  );

  if (rows.length === 0) return;

  await pool.query(
    `UPDATE bookings
     SET status = 'completed'
     WHERE COALESCE(status, 'pending') IN ('confirmed', 'ongoing')
       AND end_date < NOW()`
  );

  for (const row of rows) {
    await pool.query(
      `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by_user_id, notes)
       VALUES (?, ?, 'completed', NULL, ?)`,
      [row.booking_id, row.booking_status, "Booking automatically marked as completed after end date"]
    );
  }
}

async function notifyUser(pool, userId, type, title, message, relatedTable, relatedId) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, relatedTable, relatedId]
  );
}

router.get("/", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    await syncCompletedBookings(pool);
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
         COALESCE(NULLIF(p.status, ''), 'pending') AS payment_status,
         p.paid_at,
         p.received_by_name,
         payment_user.username AS payment_received_by_username
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       INNER JOIN \`user\` u ON u.user_id = r.user_id
        LEFT JOIN payments p ON p.booking_id = b.booking_id
        LEFT JOIN \`user\` payment_user ON payment_user.user_id = p.received_by_user_id
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
              receivedByName: row.received_by_name || "",
              receivedByUsername: row.payment_received_by_username || "",
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

router.get("/payment-records", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    await syncCompletedBookings(pool);
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         b.booking_id,
         COALESCE(b.status, 'pending') AS booking_status,
         b.total_cost,
         b.start_date,
         b.end_date,
         b.created_at,
         v.brand,
         v.model,
         v.plate_number,
         u.username AS renter_username,
         u.email AS renter_email,
         p.payment_id,
         p.method AS payment_method,
         p.amount AS payment_amount,
         COALESCE(NULLIF(p.status, ''), 'pending') AS payment_status,
         p.paid_at,
         p.received_by_name,
         payment_user.username AS payment_received_by_username,
         i.invoice_id,
         i.invoice_number,
         i.amount AS invoice_amount,
         COALESCE(i.status, 'unpaid') AS invoice_status,
         i.issued_at
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       INNER JOIN \`user\` u ON u.user_id = r.user_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       LEFT JOIN \`user\` payment_user ON payment_user.user_id = p.received_by_user_id
       LEFT JOIN invoice i ON i.booking_id = b.booking_id
       WHERE v.owner_id = ?
       ORDER BY COALESCE(p.paid_at, i.issued_at, b.created_at) DESC, b.booking_id DESC`,
      [ownerId]
    );

    return res.json({
      ownerId,
      records: rows.map((row) => ({
        bookingId: row.booking_id,
        bookingStatus: row.booking_status,
        bookingCreatedAt: row.created_at,
        startDate: row.start_date,
        endDate: row.end_date,
        vehicleLabel: `${row.brand} ${row.model}`.trim(),
        plateNumber: row.plate_number,
        renterName: row.renter_username,
        renterEmail: row.renter_email,
        totalCost: Number(row.total_cost),
        payment: row.payment_id
          ? {
              paymentId: row.payment_id,
              method: row.payment_method,
              amount: Number(row.payment_amount),
              status: row.payment_status,
              paidAt: row.paid_at,
              receivedByName: row.received_by_name || "",
              receivedByUsername: row.payment_received_by_username || "",
            }
          : null,
        invoice: row.invoice_id
          ? {
              invoiceId: row.invoice_id,
              invoiceNumber: row.invoice_number || buildInvoiceNumber(row.invoice_id),
              amount: Number(row.invoice_amount),
              status: row.invoice_status,
              issuedAt: row.issued_at,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Owner payment records error:", error);
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
    await pool.query(
      `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by_user_id, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [bookingId, booking.booking_status, nextStatus, req.auth.sub, `Owner marked booking as ${nextStatus}`]
    );

    const [renterRows] = await pool.query(
      `SELECT r.user_id
       FROM bookings b
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       WHERE b.booking_id = ?
       LIMIT 1`,
      [bookingId]
    );
    const renterUserId = renterRows[0]?.user_id;
    if (renterUserId) {
      await notifyUser(
        pool,
        renterUserId,
        nextStatus === "confirmed" ? "booking_confirmation" : "booking_cancellation",
        nextStatus === "confirmed" ? "Booking confirmed" : "Booking cancelled",
        nextStatus === "confirmed"
          ? "Your booking has been confirmed by the owner."
          : "Your booking has been cancelled by the owner.",
        "bookings",
        bookingId
      );
    }

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
  const receivedByName = String(req.body?.receivedByName || "").trim();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  if (nextStatus !== "paid") {
    return res.status(400).json({ message: "payment status must be paid" });
  }

  if (!receivedByName) {
    return res.status(400).json({ message: "receivedByName is required" });
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
         p.amount,
         p.method,
         COALESCE(NULLIF(p.status, ''), 'pending') AS payment_status,
         COALESCE(b.status, 'pending') AS booking_status
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

    if (!["confirmed", "ongoing", "completed"].includes(payment.booking_status)) {
      return res.status(409).json({ message: "payment can only be marked after the booking is confirmed" });
    }

    if (payment.payment_status === "paid") {
      return res.status(409).json({ message: "payment is already marked as paid" });
    }

    await pool.query(
      "UPDATE payments SET status = 'paid', paid_at = NOW(), received_by_name = ?, received_by_user_id = ? WHERE payment_id = ?",
      [receivedByName, req.auth.sub, payment.payment_id]
    );

    const [invoiceRows] = await pool.query(
      "SELECT invoice_id, invoice_number FROM invoice WHERE booking_id = ? AND owner_id = ? LIMIT 1",
      [bookingId, ownerId]
    );

    if (invoiceRows.length > 0) {
      await pool.query(
        "UPDATE invoice SET status = 'paid', issued_at = COALESCE(issued_at, NOW()) WHERE invoice_id = ?",
        [invoiceRows[0].invoice_id]
      );
    } else {
      const [amountRows] = await pool.query(
        `SELECT total_cost
         FROM bookings b
         INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         WHERE b.booking_id = ? AND v.owner_id = ?
         LIMIT 1`,
        [bookingId, ownerId]
      );

      const amount = Number(amountRows[0]?.total_cost || 0);
      const [invoiceInsert] = await pool.query(
        `INSERT INTO invoice (booking_id, owner_id, invoice_number, amount, issued_at, status)
         VALUES (?, ?, ?, ?, NOW(), 'paid')`,
        [bookingId, ownerId, `TEMP-${Date.now()}-${bookingId}`, amount]
      );
      await pool.query("UPDATE invoice SET invoice_number = ? WHERE invoice_id = ?", [
        buildInvoiceNumber(invoiceInsert.insertId),
        invoiceInsert.insertId,
      ]);
    }

    const [renterRows] = await pool.query(
      `SELECT r.user_id
       FROM bookings b
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       WHERE b.booking_id = ?
       LIMIT 1`,
      [bookingId]
    );
    const renterUserId = renterRows[0]?.user_id;
    if (renterUserId) {
      await notifyUser(
        pool,
        renterUserId,
        "payment_receipt",
        "Payment received",
        `The owner has marked your booking payment as paid and recorded it under ${receivedByName}.`,
        "payments",
        payment.payment_id
      );
    }

    return res.json({
      message: "payment marked as paid",
      payment: {
        paymentId: payment.payment_id,
        bookingId,
        status: "paid",
        amount: Number(payment.amount || 0),
        method: payment.method || "",
        receivedByName,
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

router.get("/:bookingId/invoice", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
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
         b.start_date,
         b.end_date,
         b.pickup_location,
         b.dropoff_location,
         COALESCE(b.status, 'pending') AS booking_status,
         v.brand,
         v.model,
         v.plate_number,
         u.username AS renter_username,
         u.email AS renter_email,
         p.method AS payment_method,
         p.amount AS payment_amount,
         COALESCE(NULLIF(p.status, ''), 'pending') AS payment_status,
         p.paid_at,
         p.received_by_name,
         payment_user.username AS payment_received_by_username,
         i.invoice_id,
         i.invoice_number,
         i.amount AS invoice_amount,
         COALESCE(i.status, 'unpaid') AS invoice_status,
         i.issued_at
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       INNER JOIN \`user\` u ON u.user_id = r.user_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       LEFT JOIN \`user\` payment_user ON payment_user.user_id = p.received_by_user_id
       LEFT JOIN invoice i ON i.booking_id = b.booking_id
       WHERE b.booking_id = ? AND v.owner_id = ?
       LIMIT 1`,
      [bookingId, ownerId]
    );

    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (!booking.invoice_id) {
      return res.status(404).json({ message: "invoice not available for this booking" });
    }

    const invoiceNumber = booking.invoice_number || buildInvoiceNumber(booking.invoice_id);
    const invoiceText = [
      "CarGoAI Invoice",
      "",
      `Invoice Number: ${invoiceNumber}`,
      `Invoice ID: ${booking.invoice_id}`,
      `Booking ID: ${booking.booking_id}`,
      `Vehicle: ${`${booking.brand} ${booking.model}`.trim()}`,
      `Plate Number: ${booking.plate_number}`,
      `Booking Status: ${booking.booking_status}`,
      `Pickup Date: ${booking.start_date}`,
      `Return Date: ${booking.end_date}`,
      `Pickup Location: ${booking.pickup_location}`,
      `Dropoff Location: ${booking.dropoff_location}`,
      "",
      `Renter: ${booking.renter_username}`,
      `Renter Email: ${booking.renter_email}`,
      "",
      `Invoice Amount: ${Number(booking.invoice_amount).toFixed(2)}`,
      `Invoice Status: ${booking.invoice_status}`,
      `Issued At: ${booking.issued_at || "Not available"}`,
      `Payment Method: ${booking.payment_method ? String(booking.payment_method).toUpperCase() : "Pending"}`,
      `Payment Amount: ${Number(booking.payment_amount || booking.invoice_amount || 0).toFixed(2)}`,
      `Payment Status: ${booking.payment_status}`,
      `Payment Paid At: ${booking.paid_at || "Not available"}`,
      `Payment Received By: ${booking.received_by_name || "Not available"}`,
      `Recorded By Account: ${booking.payment_received_by_username || "Not available"}`,
      "",
      "Generated by CarGoAI",
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceNumber}.txt"`);
    return res.send(invoiceText);
  } catch (error) {
    console.error("Owner invoice download error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
