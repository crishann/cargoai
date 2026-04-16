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

async function getRenterIdByUserId(pool, userId) {
  const [rows] = await pool.query(
    "SELECT renter_id FROM car_renter WHERE user_id = ? LIMIT 1",
    [userId]
  );

  return rows[0]?.renter_id || null;
}

async function getVehicleImagesByIds(pool, vehicleIds) {
  if (vehicleIds.length === 0) return new Map();

  const placeholders = vehicleIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT image_id, vehicle_id, image_url, COALESCE(is_primary, 0) AS is_primary
     FROM vehicle_image
     WHERE vehicle_id IN (${placeholders})
     ORDER BY vehicle_id, is_primary DESC, image_id ASC`,
    vehicleIds
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.vehicle_id)) map.set(row.vehicle_id, []);
    map.get(row.vehicle_id).push({
      imageId: row.image_id,
      imageUrl: row.image_url,
      isPrimary: Boolean(row.is_primary),
    });
  }
  return map;
}

function toSqlDateTime(value, endOfDay = false) {
  if (!value) return null;
  return `${value} ${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function normalizeDateInput(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function calculateRentalDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffDays = Math.round((end - start) / 86400000);
  return diffDays + 1;
}

const ALLOWED_PAYMENT_METHODS = new Set(["cash", "gcash"]);

router.get("/vehicles", requireAuth, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT
         v.vehicle_id,
         v.brand,
         v.model,
         v.year,
         v.plate_number,
         v.rate_per_day,
         v.features,
         COALESCE(v.status, 'inactive') AS status,
         v.created_at,
         primary_image.image_url AS primary_image_url,
         COUNT(vi.image_id) AS image_count
       FROM vehicles v
       LEFT JOIN vehicle_image vi
         ON vi.vehicle_id = v.vehicle_id
       LEFT JOIN vehicle_image primary_image
         ON primary_image.vehicle_id = v.vehicle_id AND primary_image.is_primary = 1
       WHERE COALESCE(v.status, 'inactive') = 'available'
       GROUP BY
         v.vehicle_id, v.brand, v.model, v.year, v.plate_number,
         v.rate_per_day, v.features, v.status, v.created_at, primary_image.image_url
       ORDER BY v.created_at DESC, v.vehicle_id DESC`
    );

    const imageMap = await getVehicleImagesByIds(pool, rows.map((row) => row.vehicle_id));

    return res.json({
      vehicles: rows.map((row) => ({
        vehicleId: row.vehicle_id,
        title: `${row.brand} ${row.model}`.trim(),
        brand: row.brand,
        model: row.model,
        year: row.year,
        plateNumber: row.plate_number,
        ratePerDay: Number(row.rate_per_day),
        features: row.features || "",
        status: row.status || "inactive",
        imageUrl: row.primary_image_url || "",
        imageCount: Number(row.image_count || 0),
        images: imageMap.get(row.vehicle_id) || [],
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Renter vehicles error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/bookings", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
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
         p.payment_id,
         p.method AS payment_method,
         p.amount AS payment_amount,
         COALESCE(p.status, 'pending') AS payment_status,
         p.paid_at,
         i.invoice_id,
         i.amount AS invoice_amount,
         COALESCE(i.status, 'unpaid') AS invoice_status,
         i.issued_at
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       LEFT JOIN invoice i ON i.booking_id = b.booking_id
       WHERE b.renter_id = ?
       ORDER BY b.start_date DESC, b.booking_id DESC`,
      [renterId]
    );

    return res.json({
      renterId,
      bookings: rows.map((row) => ({
        bookingId: row.booking_id,
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
        invoice: row.invoice_id
          ? {
              invoiceId: row.invoice_id,
              amount: Number(row.invoice_amount),
              status: row.invoice_status,
              issuedAt: row.issued_at,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Renter bookings error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/bookings", requireAuth, async (req, res) => {
  const vehicleId = Number(req.body?.vehicleId);
  const startDate = normalizeDateInput(req.body?.startDate);
  const endDate = normalizeDateInput(req.body?.endDate);
  const pickupLocation = String(req.body?.pickupLocation || "").trim();
  const dropoffLocation = String(req.body?.dropoffLocation || "").trim();

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({ message: "valid vehicle is required" });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "start and end dates are required" });
  }

  if (!pickupLocation || !dropoffLocation) {
    return res.status(400).json({ message: "pickup and dropoff locations are required" });
  }

  if (startDate > endDate) {
    return res.status(400).json({ message: "end date must be on or after the start date" });
  }

  const rentalDays = calculateRentalDays(startDate, endDate);
  if (!Number.isFinite(rentalDays) || rentalDays <= 0) {
    return res.status(400).json({ message: "invalid booking date range" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [vehicleRows] = await pool.query(
      `SELECT vehicle_id, rate_per_day, COALESCE(status, 'inactive') AS status
       FROM vehicles
       WHERE vehicle_id = ?
       LIMIT 1`,
      [vehicleId]
    );

    const vehicle = vehicleRows[0];
    if (!vehicle) {
      return res.status(404).json({ message: "vehicle not found" });
    }

    if (vehicle.status !== "available") {
      return res.status(409).json({ message: "vehicle is not currently available for booking" });
    }

    const startDateTime = toSqlDateTime(startDate, false);
    const endDateTime = toSqlDateTime(endDate, true);

    const [conflictingBookings] = await pool.query(
      `SELECT booking_id
       FROM bookings
       WHERE vehicle_id = ?
         AND COALESCE(status, 'pending') IN ('pending', 'confirmed', 'ongoing')
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1`,
      [vehicleId, endDateTime, startDateTime]
    );

    if (conflictingBookings.length > 0) {
      return res.status(409).json({ message: "vehicle is already reserved for the selected dates" });
    }

    const [conflictingBlockouts] = await pool.query(
      `SELECT blockout_id
       FROM vehicle_blockouts
       WHERE vehicle_id = ?
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1`,
      [vehicleId, endDateTime, startDateTime]
    );

    if (conflictingBlockouts.length > 0) {
      return res.status(409).json({ message: "vehicle is blocked out for the selected dates" });
    }

    const totalCost = Number(vehicle.rate_per_day) * rentalDays;

    const [result] = await pool.query(
      `INSERT INTO bookings (
         renter_id,
         vehicle_id,
         driver_id,
         start_date,
         end_date,
         pickup_location,
         dropoff_location,
         total_cost,
         status
       ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'pending')`,
      [renterId, vehicleId, startDateTime, endDateTime, pickupLocation, dropoffLocation, totalCost]
    );

    return res.status(201).json({
      message: "reservation created",
      booking: {
        bookingId: result.insertId,
        renterId,
        vehicleId,
        startDate: startDateTime,
        endDate: endDateTime,
        pickupLocation,
        dropoffLocation,
        totalCost,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Create renter booking error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/bookings/:bookingId/payment", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const method = String(req.body?.method || "").trim().toLowerCase();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  if (!ALLOWED_PAYMENT_METHODS.has(method)) {
    return res.status(400).json({ message: "payment method must be cash or gcash" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [bookingRows] = await pool.query(
      `SELECT booking_id, total_cost, COALESCE(status, 'pending') AS booking_status
       FROM bookings
       WHERE booking_id = ?
         AND renter_id = ?
       LIMIT 1`,
      [bookingId, renterId]
    );

    const booking = bookingRows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (!["confirmed", "ongoing"].includes(booking.booking_status)) {
      return res.status(409).json({ message: "payment can only be submitted for confirmed bookings" });
    }

    const [existingPaymentRows] = await pool.query(
      "SELECT payment_id, status FROM payments WHERE booking_id = ? LIMIT 1",
      [bookingId]
    );

    if (existingPaymentRows.length > 0) {
      const existingPayment = existingPaymentRows[0];
      if (existingPayment.status === "paid") {
        return res.status(409).json({ message: "payment is already marked as paid" });
      }

      await pool.query(
        "UPDATE payments SET method = ?, amount = ?, status = 'pending', paid_at = NULL WHERE payment_id = ?",
        [method, Number(booking.total_cost), existingPayment.payment_id]
      );

      return res.json({
        message: "payment method updated",
        payment: {
          paymentId: existingPayment.payment_id,
          bookingId,
          method,
          amount: Number(booking.total_cost),
          status: "pending",
          paidAt: null,
        },
      });
    }

    const [result] = await pool.query(
      `INSERT INTO payments (booking_id, method, amount, status, paid_at)
       VALUES (?, ?, ?, 'pending', NULL)`,
      [bookingId, method, Number(booking.total_cost)]
    );

    return res.status(201).json({
      message: "payment submitted",
      payment: {
        paymentId: result.insertId,
        bookingId,
        method,
        amount: Number(booking.total_cost),
        status: "pending",
        paidAt: null,
      },
    });
  } catch (error) {
    console.error("Create renter payment error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
