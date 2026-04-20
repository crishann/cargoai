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

function formatChatDate(value) {
  const text = String(value || "").slice(0, 10);
  if (!text) return "Not available";
  const [year, month, day] = text.split("-").map(Number);
  if (!year || !month || !day) return text;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildBookingLabel(booking) {
  return `${booking.vehicle_label} (BK-${String(booking.booking_id).padStart(6, "0")})`;
}

function summarizeBookingsForChat(rows) {
  return rows.map((row) => ({
    bookingId: row.booking_id,
    vehicleLabel: row.vehicle_label,
    bookingStatus: row.booking_status,
    startDate: row.booking_start_date,
    endDate: row.booking_end_date,
    paymentMethod: row.payment_method || "",
    paymentStatus: row.payment_status || "pending",
    invoiceStatus: row.invoice_status || "unpaid",
    totalCost: Number(row.total_cost || 0),
  }));
}

function buildChatbotReply(message, bookings, selectedBooking) {
  const normalized = String(message || "").trim().toLowerCase();
  if (!normalized) {
    return {
      answer:
        "Ask about your booking status, payment method, invoice, cancellation, rebooking, or upcoming pickup schedule.",
      suggestions: ["Show my upcoming booking", "Can I cancel my booking?", "Do I have an invoice?"],
    };
  }

  const subjectBooking =
    selectedBooking ||
    bookings.find((booking) => ["pending", "confirmed", "ongoing"].includes(booking.bookingStatus)) ||
    bookings[0] ||
    null;

  if (normalized.includes("upcoming") || normalized.includes("next booking") || normalized.includes("pickup")) {
    if (!subjectBooking) {
      return {
        answer: "You do not have an upcoming booking right now.",
        suggestions: ["Show my booking history", "How do I rebook?"],
      };
    }

    return {
      answer: `Your nearest booking is ${subjectBooking.vehicleLabel} from ${formatChatDate(subjectBooking.startDate)} to ${formatChatDate(subjectBooking.endDate)}. Its status is ${subjectBooking.bookingStatus}.`,
      suggestions: ["Can I cancel it?", "What is my payment method?", "Do I have an invoice?"],
    };
  }

  if (normalized.includes("payment") || normalized.includes("gcash") || normalized.includes("cash")) {
    if (!subjectBooking) {
      return {
        answer: "I could not find a booking payment record yet.",
        suggestions: ["Show my bookings", "How do I rebook?"],
      };
    }

    const method = subjectBooking.paymentMethod ? subjectBooking.paymentMethod.toUpperCase() : "Not selected";
    const cashNote =
      subjectBooking.paymentMethod === "cash"
        ? "Cash bookings are usually settled face to face during pickup."
        : subjectBooking.paymentMethod === "gcash"
          ? "GCash is recorded as the selected payment method for this booking."
          : "No payment method is currently recorded.";

    return {
      answer: `For ${subjectBooking.vehicleLabel}, your payment method is ${method} and the payment status is ${subjectBooking.paymentStatus}. ${cashNote}`,
      suggestions: ["Do I have an invoice?", "Can I cancel this booking?"],
    };
  }

  if (normalized.includes("invoice")) {
    if (!subjectBooking) {
      return {
        answer: "I could not find a booking with an invoice record.",
        suggestions: ["Show my bookings", "What is my payment status?"],
      };
    }

    const hasInvoice = subjectBooking.invoiceStatus && subjectBooking.invoiceStatus !== "unpaid";
    return {
      answer: hasInvoice
        ? `Your booking ${buildBookingLabel({
            booking_id: subjectBooking.bookingId,
            vehicle_label: subjectBooking.vehicleLabel,
          })} has an invoice with status ${subjectBooking.invoiceStatus}. You can open View Details and choose Show invoice or Download invoice.`
        : `There is no issued invoice yet for ${subjectBooking.vehicleLabel}. Invoice availability depends on the booking and payment flow.`,
      suggestions: ["Show my payment method", "What is my booking status?"],
    };
  }

  if (normalized.includes("cancel")) {
    if (!subjectBooking) {
      return {
        answer: "I could not find an active booking to evaluate for cancellation.",
        suggestions: ["Show my upcoming booking", "How do I rebook?"],
      };
    }

    const canCancel = ["pending", "confirmed"].includes(subjectBooking.bookingStatus);
    return {
      answer: canCancel
        ? `Booking ${buildBookingLabel({
            booking_id: subjectBooking.bookingId,
            vehicle_label: subjectBooking.vehicleLabel,
          })} can usually be cancelled from My Bookings as long as the pickup date has not started yet.`
        : `Booking ${subjectBooking.vehicleLabel} is currently ${subjectBooking.bookingStatus}, so cancellation may no longer be available from the renter side.`,
      suggestions: ["How do I rebook?", "What is my booking status?"],
    };
  }

  if (normalized.includes("rebook") || normalized.includes("book again")) {
    const pastBooking = bookings.find((booking) => ["completed", "cancelled"].includes(booking.bookingStatus));
    return {
      answer: pastBooking
        ? `You can rebook from your History page. Past bookings like ${pastBooking.vehicleLabel} should show a Rebook action that sends you back to the renter car list with details prefilled.`
        : "Rebooking is available from History for completed or cancelled bookings.",
      suggestions: ["Show my history", "Can I cancel my booking?"],
    };
  }

  if (normalized.includes("status") || normalized.includes("booking")) {
    if (!subjectBooking) {
      return {
        answer: "I could not find a booking record for your account yet.",
        suggestions: ["Show my upcoming booking", "How do I make a booking?"],
      };
    }

    return {
      answer: `Booking ${buildBookingLabel({
        booking_id: subjectBooking.bookingId,
        vehicle_label: subjectBooking.vehicleLabel,
      })} is currently ${subjectBooking.bookingStatus}. Its schedule is ${formatChatDate(subjectBooking.startDate)} to ${formatChatDate(subjectBooking.endDate)}.`,
      suggestions: ["What is my payment method?", "Do I have an invoice?", "Can I cancel it?"],
    };
  }

  return {
    answer:
      "I can help with booking status, upcoming pickup dates, payment method, invoices, cancellation, and rebooking. Try asking one of those directly.",
    suggestions: ["Show my upcoming booking", "What is my payment method?", "Do I have an invoice?"],
  };
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

async function getRenterBookingDetails(pool, bookingId, renterId) {
  const [rows] = await pool.query(
    `SELECT
       b.booking_id,
       b.start_date,
       b.end_date,
       DATE_FORMAT(b.start_date, '%Y-%m-%d') AS booking_start_date,
       DATE_FORMAT(b.end_date, '%Y-%m-%d') AS booking_end_date,
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
       v.car_type,
       v.seat_capacity,
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
       i.issued_at,
       rv.review_id,
       rv.car_rating,
       rv.experience_rating,
       rv.review_text,
       rv.owner_response,
       rv.owner_responded_at,
       c.contract_id,
       c.contract_number,
       c.status AS contract_status,
       c.terms_and_conditions,
       c.security_deposit,
       c.renter_agreed_at,
       c.renter_agreement_name,
       owner_user.username AS owner_username,
       owner_user.email AS owner_email
     FROM bookings b
     INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
     INNER JOIN car_owners owner ON owner.owner_id = v.owner_id
     INNER JOIN \`user\` owner_user ON owner_user.user_id = owner.user_id
     LEFT JOIN payments p ON p.booking_id = b.booking_id
      LEFT JOIN invoice i ON i.booking_id = b.booking_id
      LEFT JOIN \`user\` payment_user ON payment_user.user_id = p.received_by_user_id
     LEFT JOIN reviews rv ON rv.booking_id = b.booking_id
     LEFT JOIN contracts c ON c.booking_id = b.booking_id
     WHERE b.booking_id = ?
       AND b.renter_id = ?
     LIMIT 1`,
    [bookingId, renterId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    bookingId: row.booking_id,
    vehicleId: row.vehicle_id,
    vehicleLabel: `${row.brand} ${row.model}`.trim(),
    year: row.year,
    plateNumber: row.plate_number,
    carType: row.car_type || "",
    seatCapacity: row.seat_capacity === null ? null : Number(row.seat_capacity),
    startDate: row.booking_start_date || row.start_date,
    endDate: row.booking_end_date || row.end_date,
    pickupLocation: row.pickup_location,
    dropoffLocation: row.dropoff_location,
    totalCost: Number(row.total_cost),
    bookingStatus: row.booking_status,
    createdAt: row.created_at,
    owner: {
      name: row.owner_username || "Owner",
      email: row.owner_email || "",
    },
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
    review: row.review_id
      ? {
          reviewId: row.review_id,
          carRating: row.car_rating === null ? null : Number(row.car_rating),
          experienceRating: row.experience_rating === null ? null : Number(row.experience_rating),
          reviewText: row.review_text || "",
          ownerResponse: row.owner_response || "",
          ownerRespondedAt: row.owner_responded_at,
        }
      : null,
    contract: row.contract_id
      ? {
          contractId: row.contract_id,
          contractNumber: row.contract_number,
          status: row.contract_status,
          termsAndConditions: row.terms_and_conditions || "",
          securityDeposit: Number(row.security_deposit || 0),
          renterAgreedAt: row.renter_agreed_at,
          renterAgreementName: row.renter_agreement_name || "",
        }
      : null,
  };
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

async function getVehicleReviewsByIds(pool, vehicleIds) {
  if (vehicleIds.length === 0) {
    return { reviewMap: new Map(), summaryMap: new Map() };
  }

  const placeholders = vehicleIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT
       rv.review_id,
       rv.vehicle_id,
       rv.car_rating,
       rv.experience_rating,
       rv.review_text,
       rv.owner_response,
       rv.owner_responded_at,
       rv.created_at,
       u.username AS renter_username
     FROM reviews rv
     INNER JOIN car_renter r ON r.renter_id = rv.renter_id
     INNER JOIN \`user\` u ON u.user_id = r.user_id
     WHERE rv.vehicle_id IN (${placeholders})
     ORDER BY rv.created_at DESC, rv.review_id DESC`,
    vehicleIds
  );

  const reviewMap = new Map();
  const summaryMap = new Map();

  for (const row of rows) {
    if (!reviewMap.has(row.vehicle_id)) reviewMap.set(row.vehicle_id, []);
    reviewMap.get(row.vehicle_id).push({
      reviewId: row.review_id,
      renterName: row.renter_username || "Renter",
      carRating: row.car_rating === null ? null : Number(row.car_rating),
      experienceRating: row.experience_rating === null ? null : Number(row.experience_rating),
      averageRating: ((Number(row.car_rating || 0) + Number(row.experience_rating || 0)) / 2),
      reviewText: row.review_text || "",
      ownerResponse: row.owner_response || "",
      ownerRespondedAt: row.owner_responded_at,
      createdAt: row.created_at,
    });

    if (!summaryMap.has(row.vehicle_id)) {
      summaryMap.set(row.vehicle_id, { reviewCount: 0, totalAverage: 0, totalCar: 0, totalExperience: 0 });
    }

    const summary = summaryMap.get(row.vehicle_id);
    summary.reviewCount += 1;
    summary.totalCar += Number(row.car_rating || 0);
    summary.totalExperience += Number(row.experience_rating || 0);
    summary.totalAverage += (Number(row.car_rating || 0) + Number(row.experience_rating || 0)) / 2;
  }

  return { reviewMap, summaryMap };
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

function buildContractNumber(bookingId) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `CTR-${stamp}-${bookingId}`;
}

function buildInvoiceNumber(invoiceId) {
  return `INV-${String(invoiceId).padStart(6, "0")}`;
}

async function notifyUser(pool, userId, type, title, message, relatedTable, relatedId) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, relatedTable, relatedId]
  );
}

async function getOwnerContractTemplate(pool, ownerId) {
  const [rows] = await pool.query(
    `SELECT template_title, terms_and_conditions, security_deposit, updated_at
     FROM owner_contract_templates
     WHERE owner_id = ?
     LIMIT 1`,
    [ownerId]
  );

  const template = rows[0];
  if (!template) return null;

  return {
    title: template.template_title || "Rental Agreement",
    termsAndConditions: template.terms_and_conditions || "",
    securityDeposit: Number(template.security_deposit || 0),
    updatedAt: template.updated_at,
  };
}

async function listAvailableVehicles(pool, { requireContractTemplate = false } = {}) {
  const contractJoin = requireContractTemplate
    ? `INNER JOIN owner_contract_templates oct
         ON oct.owner_id = v.owner_id
        AND TRIM(COALESCE(oct.terms_and_conditions, '')) <> ''`
    : `LEFT JOIN owner_contract_templates oct
         ON oct.owner_id = v.owner_id`;

  const [rows] = await pool.query(
    `SELECT
       v.vehicle_id,
       v.owner_id,
       v.brand,
       v.model,
       v.car_type,
       v.year,
       v.seat_capacity,
       v.plate_number,
       v.rate_per_day,
       v.features,
       oct.template_title AS contract_template_title,
       oct.terms_and_conditions AS contract_template_terms,
       oct.security_deposit AS contract_template_security_deposit,
       COALESCE(v.status, 'inactive') AS status,
       v.created_at,
       primary_image.image_url AS primary_image_url,
       COUNT(vi.image_id) AS image_count
      FROM vehicles v
      LEFT JOIN vehicle_image vi
        ON vi.vehicle_id = v.vehicle_id
      LEFT JOIN vehicle_image primary_image
        ON primary_image.vehicle_id = v.vehicle_id AND primary_image.is_primary = 1
      ${contractJoin}
      WHERE COALESCE(v.status, 'inactive') = 'available'
      GROUP BY
        v.vehicle_id, v.owner_id, v.brand, v.model, v.car_type, v.year, v.plate_number,
        v.rate_per_day, v.features, oct.template_title, oct.terms_and_conditions, oct.security_deposit,
        v.status, v.created_at, primary_image.image_url
       ORDER BY v.created_at DESC, v.vehicle_id DESC`
  );

  const imageMap = await getVehicleImagesByIds(pool, rows.map((row) => row.vehicle_id));
  const { reviewMap, summaryMap } = await getVehicleReviewsByIds(pool, rows.map((row) => row.vehicle_id));

  return rows.map((row) => ({
    reviewSummary: summaryMap.has(row.vehicle_id)
      ? {
          reviewCount: summaryMap.get(row.vehicle_id).reviewCount,
          averageRating: Number((summaryMap.get(row.vehicle_id).totalAverage / summaryMap.get(row.vehicle_id).reviewCount).toFixed(1)),
          averageCarRating: Number((summaryMap.get(row.vehicle_id).totalCar / summaryMap.get(row.vehicle_id).reviewCount).toFixed(1)),
          averageExperienceRating: Number((summaryMap.get(row.vehicle_id).totalExperience / summaryMap.get(row.vehicle_id).reviewCount).toFixed(1)),
        }
      : {
          reviewCount: 0,
          averageRating: null,
          averageCarRating: null,
          averageExperienceRating: null,
        },
    vehicleId: row.vehicle_id,
    ownerId: row.owner_id,
    title: `${row.brand} ${row.model}`.trim(),
    brand: row.brand,
    model: row.model,
    carType: row.car_type || "",
    year: row.year,
    seatCapacity: row.seat_capacity === null ? null : Number(row.seat_capacity),
    plateNumber: row.plate_number,
    ratePerDay: Number(row.rate_per_day),
    features: row.features || "",
    contractTemplateTitle: row.contract_template_title || "Rental Agreement",
    contractTemplate: row.contract_template_terms || "",
    contractSecurityDeposit: Number(row.contract_template_security_deposit || 0),
    status: row.status || "inactive",
    imageUrl: row.primary_image_url || "",
    imageCount: Number(row.image_count || 0),
    images: imageMap.get(row.vehicle_id) || [],
    reviews: reviewMap.get(row.vehicle_id) || [],
    createdAt: row.created_at,
  }));
}

router.get("/public/vehicles", async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const vehicles = await listAvailableVehicles(pool, { requireContractTemplate: true });

    return res.json({ vehicles });
  } catch (error) {
    console.error("Public renter vehicles error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/vehicles", requireAuth, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const vehicles = await listAvailableVehicles(pool);

    return res.json({
      vehicles,
    });
  } catch (error) {
    console.error("Renter vehicles error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/vehicles/:vehicleId/availability", requireAuth, async (req, res) => {
  const vehicleId = Number(req.params.vehicleId);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({ message: "valid vehicle id is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();

    const [vehicleRows] = await pool.query(
      `SELECT vehicle_id, brand, model
       FROM vehicles
       WHERE vehicle_id = ?
       LIMIT 1`,
      [vehicleId]
    );

    const vehicle = vehicleRows[0];
    if (!vehicle) {
      return res.status(404).json({ message: "vehicle not found" });
    }

    const [bookingRows] = await pool.query(
      `SELECT booking_id, start_date, end_date, COALESCE(status, 'pending') AS status
       FROM bookings
       WHERE vehicle_id = ?
         AND COALESCE(status, 'pending') IN ('pending', 'confirmed', 'ongoing')
       ORDER BY start_date ASC, booking_id ASC`,
      [vehicleId]
    );

    const [blockoutRows] = await pool.query(
      `SELECT blockout_id, start_date, end_date, reason
       FROM vehicle_blockouts
       WHERE vehicle_id = ?
       ORDER BY start_date ASC, blockout_id ASC`,
      [vehicleId]
    );

    return res.json({
      vehicle: {
        vehicleId: vehicle.vehicle_id,
        label: `${vehicle.brand} ${vehicle.model}`.trim(),
      },
      reservations: bookingRows.map((row) => ({
        bookingId: row.booking_id,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
      })),
      blockouts: blockoutRows.map((row) => ({
        blockoutId: row.blockout_id,
        startDate: row.start_date,
        endDate: row.end_date,
        reason: row.reason || "Owner blockout",
      })),
    });
  } catch (error) {
    console.error("Renter vehicle availability error:", error);
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
    await syncCompletedBookings(pool);
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         b.booking_id,
         b.start_date,
         b.end_date,
         DATE_FORMAT(b.start_date, '%Y-%m-%d') AS booking_start_date,
         DATE_FORMAT(b.end_date, '%Y-%m-%d') AS booking_end_date,
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
         COALESCE(NULLIF(p.status, ''), 'pending') AS payment_status,
         p.paid_at,
         p.received_by_name,
         payment_user.username AS payment_received_by_username,
         i.invoice_id,
         i.invoice_number,
         i.amount AS invoice_amount,
         COALESCE(i.status, 'unpaid') AS invoice_status,
         i.issued_at,
         rv.review_id,
         rv.car_rating,
         rv.experience_rating,
         rv.review_text,
         rv.owner_response,
         rv.owner_responded_at
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       LEFT JOIN invoice i ON i.booking_id = b.booking_id
       LEFT JOIN \`user\` payment_user ON payment_user.user_id = p.received_by_user_id
       LEFT JOIN reviews rv ON rv.booking_id = b.booking_id
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
        startDate: row.booking_start_date || row.start_date,
        endDate: row.booking_end_date || row.end_date,
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
        invoice: row.invoice_id
          ? {
              invoiceId: row.invoice_id,
              invoiceNumber: row.invoice_number || buildInvoiceNumber(row.invoice_id),
              amount: Number(row.invoice_amount),
              status: row.invoice_status,
              issuedAt: row.issued_at,
            }
          : null,
        review: row.review_id
          ? {
              reviewId: row.review_id,
              carRating: row.car_rating === null ? null : Number(row.car_rating),
              experienceRating: row.experience_rating === null ? null : Number(row.experience_rating),
              reviewText: row.review_text || "",
              ownerResponse: row.owner_response || "",
              ownerRespondedAt: row.owner_responded_at,
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

router.post("/chatbot", requireAuth, async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const requestedBookingId = Number(req.body?.bookingId);

  try {
    await initDatabase();
    const pool = getPool();
    await syncCompletedBookings(pool);
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         b.booking_id,
         CONCAT(v.brand, ' ', v.model) AS vehicle_label,
         COALESCE(b.status, 'pending') AS booking_status,
         DATE_FORMAT(b.start_date, '%Y-%m-%d') AS booking_start_date,
         DATE_FORMAT(b.end_date, '%Y-%m-%d') AS booking_end_date,
         b.total_cost,
         p.method AS payment_method,
         COALESCE(NULLIF(p.status, ''), 'pending') AS payment_status,
         COALESCE(i.status, 'unpaid') AS invoice_status
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       LEFT JOIN invoice i ON i.booking_id = b.booking_id
       WHERE b.renter_id = ?
       ORDER BY b.start_date DESC, b.booking_id DESC`,
      [renterId]
    );

    const bookings = summarizeBookingsForChat(rows);
    const selectedBooking = Number.isInteger(requestedBookingId) && requestedBookingId > 0
      ? bookings.find((booking) => booking.bookingId === requestedBookingId) || null
      : null;

    const reply = buildChatbotReply(message, bookings, selectedBooking);

    return res.json({
      answer: reply.answer,
      suggestions: reply.suggestions || [],
      bookingCount: bookings.length,
    });
  } catch (error) {
    console.error("Renter chatbot error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/chatbot/feedback", requireAuth, async (req, res) => {
  const rating = Number(req.body?.rating);
  const feedbackText = String(req.body?.feedbackText || "").trim();
  const bookingId = req.body?.bookingId ? Number(req.body.bookingId) : null;

  if (![1, 2, 3, 4, 5].includes(rating)) {
    return res.status(400).json({ message: "rating must be between 1 and 5" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    let validBookingId = null;
    if (Number.isInteger(bookingId) && bookingId > 0) {
      const [bookingRows] = await pool.query(
        "SELECT booking_id FROM bookings WHERE booking_id = ? AND renter_id = ? LIMIT 1",
        [bookingId, renterId]
      );
      validBookingId = bookingRows[0]?.booking_id || null;
    }

    const [result] = await pool.query(
      `INSERT INTO chatbot_feedback (user_id, booking_id, rating, feedback_text)
       VALUES (?, ?, ?, ?)`,
      [req.auth.sub, validBookingId, rating, feedbackText || null]
    );

    return res.status(201).json({
      message: "feedback saved",
      feedbackId: result.insertId,
    });
  } catch (error) {
    console.error("Renter chatbot feedback error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/complaints", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         c.complaint_id,
         c.booking_id,
         c.subject,
         c.description,
         c.status,
         c.resolution_notes,
         c.resolved_at,
         c.created_at,
         b.start_date,
         b.end_date,
         CONCAT(v.brand, ' ', v.model) AS vehicle_label,
         v.plate_number,
         owner_user.username AS against_username,
         owner_user.email AS against_email,
         resolver.username AS resolved_by_username
       FROM complaints c
       LEFT JOIN bookings b ON b.booking_id = c.booking_id
       LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       LEFT JOIN car_owners owner ON owner.user_id = c.against_user_id
       LEFT JOIN \`user\` owner_user ON owner_user.user_id = c.against_user_id
       LEFT JOIN \`user\` resolver ON resolver.user_id = c.resolved_by_user_id
       WHERE c.complainant_user_id = ?
       ORDER BY c.created_at DESC, c.complaint_id DESC`,
      [req.auth.sub]
    );

    return res.json({
      complaints: rows.map((row) => ({
        complaintId: row.complaint_id,
        bookingId: row.booking_id || null,
        subject: row.subject,
        description: row.description,
        status: row.status,
        resolutionNotes: row.resolution_notes || "",
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        booking: row.booking_id
          ? {
              bookingId: row.booking_id,
              vehicleLabel: row.vehicle_label || "Booking",
              plateNumber: row.plate_number || "",
              startDate: row.start_date ? String(row.start_date).slice(0, 10) : "",
              endDate: row.end_date ? String(row.end_date).slice(0, 10) : "",
            }
          : null,
        againstUser: {
          username: row.against_username || "Account",
          email: row.against_email || "",
        },
        resolvedBy: row.resolved_by_username || "",
      })),
    });
  } catch (error) {
    console.error("Renter complaints error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/complaints/bookings", requireAuth, async (req, res) => {
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
         CONCAT(v.brand, ' ', v.model) AS vehicle_label,
         v.plate_number,
         DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
         owner_user.user_id AS owner_user_id,
         owner_user.username AS owner_username,
         owner_user.email AS owner_email
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_owners o ON o.owner_id = v.owner_id
       INNER JOIN \`user\` owner_user ON owner_user.user_id = o.user_id
       WHERE b.renter_id = ?
       ORDER BY b.created_at DESC, b.booking_id DESC`,
      [renterId]
    );

    return res.json({
      bookings: rows.map((row) => ({
        bookingId: row.booking_id,
        vehicleLabel: row.vehicle_label,
        plateNumber: row.plate_number,
        startDate: row.start_date,
        endDate: row.end_date,
        ownerUserId: row.owner_user_id,
        ownerUsername: row.owner_username,
        ownerEmail: row.owner_email,
      })),
    });
  } catch (error) {
    console.error("Renter complaint booking options error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/complaints", requireAuth, async (req, res) => {
  const bookingId = Number(req.body?.bookingId);
  const subject = String(req.body?.subject || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  if (!subject || !description) {
    return res.status(400).json({ message: "subject and description are required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [bookingRows] = await pool.query(
      `SELECT
         b.booking_id,
         owner_user.user_id AS owner_user_id
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_owners o ON o.owner_id = v.owner_id
       INNER JOIN \`user\` owner_user ON owner_user.user_id = o.user_id
       WHERE b.booking_id = ?
         AND b.renter_id = ?
       LIMIT 1`,
      [bookingId, renterId]
    );

    const booking = bookingRows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    const [result] = await pool.query(
      `INSERT INTO complaints (booking_id, complainant_user_id, against_user_id, subject, description, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [bookingId, req.auth.sub, booking.owner_user_id || null, subject, description]
    );

    return res.status(201).json({
      message: "complaint submitted",
      complaintId: result.insertId,
    });
  } catch (error) {
    console.error("Renter complaint create error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/bookings/:bookingId/cancel", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

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
         b.status,
         b.start_date,
         b.vehicle_id,
         owner.user_id AS owner_user_id,
         p.payment_id,
         p.status AS payment_status,
         i.invoice_id
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_owners owner ON owner.owner_id = v.owner_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       LEFT JOIN invoice i ON i.booking_id = b.booking_id
       WHERE b.booking_id = ? AND b.renter_id = ?
       LIMIT 1`,
      [bookingId, renterId]
    );

    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (!["pending", "confirmed"].includes(String(booking.status || "").toLowerCase())) {
      return res.status(409).json({ message: "only pending or confirmed bookings can be cancelled" });
    }

    const startDate = new Date(booking.start_date);
    if (!Number.isNaN(startDate.getTime()) && startDate <= new Date()) {
      return res.status(409).json({ message: "booking can no longer be cancelled on or after the pickup date" });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query("UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?", [bookingId]);
      await connection.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, ?, 'cancelled', ?, ?)`,
        [bookingId, booking.status, req.auth.sub, "Cancelled by renter"]
      );

      if (booking.payment_id && String(booking.payment_status || "").toLowerCase() !== "paid") {
        await connection.query("UPDATE payments SET status = 'pending', paid_at = NULL WHERE payment_id = ?", [booking.payment_id]);
      }

      if (booking.invoice_id) {
        await connection.query("UPDATE invoice SET status = 'cancelled' WHERE invoice_id = ?", [booking.invoice_id]);
      }

      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'booking_cancellation', ?, ?, 'bookings', ?)`,
        [
          booking.owner_user_id,
          "Booking cancelled",
          "A renter has cancelled a booking assigned to your vehicle.",
          bookingId,
        ]
      );

      await connection.commit();
      return res.json({ message: "booking cancelled", bookingId, bookingStatus: "cancelled" });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Cancel renter booking error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/bookings/:bookingId", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    await syncCompletedBookings(pool);
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const booking = await getRenterBookingDetails(pool, bookingId, renterId);
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    return res.json({ booking });
  } catch (error) {
    console.error("Renter booking details error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/bookings/:bookingId/invoice", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    await syncCompletedBookings(pool);
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const booking = await getRenterBookingDetails(pool, bookingId, renterId);
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (!booking.invoice) {
      return res.status(404).json({ message: "invoice not available for this booking" });
    }

    const invoiceNumber = `INV-${String(booking.invoice.invoiceId).padStart(6, "0")}`;
    const contractNumber = booking.contract?.contractNumber || "Not available";
    const paymentMethod = booking.payment?.method ? booking.payment.method.toUpperCase() : "Pending";
    const paymentStatus = booking.payment?.status || "pending";
    const invoiceText = [
      "CarGoAI Invoice",
      "",
      `Invoice Number: ${invoiceNumber}`,
      `Invoice ID: ${booking.invoice.invoiceId}`,
      `Booking ID: ${booking.bookingId}`,
      `Vehicle: ${booking.vehicleLabel}`,
      `Plate Number: ${booking.plateNumber}`,
      `Booking Status: ${booking.bookingStatus}`,
      `Pickup Date: ${booking.startDate}`,
      `Return Date: ${booking.endDate}`,
      `Pickup Location: ${booking.pickupLocation}`,
      `Dropoff Location: ${booking.dropoffLocation}`,
      "",
      `Invoice Amount: ${Number(booking.invoice.amount).toFixed(2)}`,
      `Invoice Status: ${booking.invoice.status}`,
      `Issued At: ${booking.invoice.issuedAt || "Not available"}`,
      `Payment Method: ${paymentMethod}`,
      `Payment Status: ${paymentStatus}`,
      `Payment Paid At: ${booking.payment?.paidAt || "Not available"}`,
      `Payment Received By: ${booking.payment?.receivedByName || "Not available"}`,
      `Recorded By Account: ${booking.payment?.receivedByUsername || "Not available"}`,
      "",
      `Owner: ${booking.owner.name}`,
      `Owner Email: ${booking.owner.email || "Not available"}`,
      `Contract Number: ${contractNumber}`,
      `Security Deposit: ${Number(booking.contract?.securityDeposit || 0).toFixed(2)}`,
      "",
      "Generated by CarGoAI",
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceNumber}.txt"`);
    return res.send(invoiceText);
  } catch (error) {
    console.error("Renter invoice download error:", error);
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
  const paymentMethod = String(req.body?.paymentMethod || "").trim().toLowerCase();
  const agreedToContract = Boolean(req.body?.agreedToContract);
  const agreementName = String(req.body?.agreementName || "").trim();

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({ message: "valid vehicle is required" });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "start and end dates are required" });
  }

  if (!pickupLocation || !dropoffLocation) {
    return res.status(400).json({ message: "pickup and dropoff locations are required" });
  }

  if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    return res.status(400).json({ message: "payment method must be cash or gcash" });
  }

  if (!agreedToContract) {
    return res.status(400).json({ message: "you must agree to the rental contract before proceeding" });
  }

  if (!agreementName) {
    return res.status(400).json({ message: "agreement name is required" });
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
    await syncCompletedBookings(pool);
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [vehicleRows] = await pool.query(
      `SELECT vehicle_id, owner_id, rate_per_day, COALESCE(status, 'inactive') AS status
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

    const ownerTemplate = await getOwnerContractTemplate(pool, vehicle.owner_id);
    if (!ownerTemplate?.termsAndConditions) {
      return res.status(409).json({ message: "the vehicle owner has not published a contract template yet" });
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
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
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

      await connection.query(
        `INSERT INTO booking_status_logs (booking_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, NULL, 'pending', ?, ?)`,
        [result.insertId, req.auth.sub, "Booking created by renter"]
      );

      const [ownerRows] = await connection.query(
        `SELECT o.owner_id, u.user_id
         FROM vehicles v
         INNER JOIN car_owners o ON o.owner_id = v.owner_id
         INNER JOIN \`user\` u ON u.user_id = o.user_id
         WHERE v.vehicle_id = ?
         LIMIT 1`,
        [vehicleId]
      );

      const owner = ownerRows[0];
      if (!owner) {
        await connection.rollback();
        return res.status(404).json({ message: "vehicle owner not found" });
      }

      await connection.query(
        `INSERT INTO payments (booking_id, method, amount, status, paid_at)
         VALUES (?, ?, ?, 'pending', NULL)`,
        [result.insertId, paymentMethod, totalCost]
      );

      await connection.query(
        `INSERT INTO contracts (
           booking_id,
           owner_id,
           renter_id,
           contract_number,
           status,
           terms_and_conditions,
           security_deposit,
           created_by_user_id,
           renter_agreed_at,
           renter_agreement_name
          ) VALUES (?, ?, ?, ?, 'prepared', ?, ?, ?, NOW(), ?)`,
        [
          result.insertId,
          owner.owner_id,
          renterId,
          buildContractNumber(result.insertId),
          ownerTemplate.termsAndConditions,
          ownerTemplate.securityDeposit,
          req.auth.sub,
          agreementName,
        ]
      );

      await notifyUser(
        connection,
        owner.user_id,
        "booking_confirmation",
        "New booking request",
        "A new renter booking with an agreed contract requires your review.",
        "bookings",
        result.insertId
      );

      await connection.commit();

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
          paymentMethod,
          contractAgreedAt: new Date().toISOString(),
        },
      });
    } catch (transactionError) {
      await connection.rollback().catch(() => {});
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Create renter booking error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/bookings/:bookingId/review", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const carRating = Number(req.body?.carRating);
  const experienceRating = Number(req.body?.experienceRating);
  const reviewText = String(req.body?.reviewText || "").trim();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: "valid booking id is required" });
  }

  if (![1, 2, 3, 4, 5].includes(carRating) || ![1, 2, 3, 4, 5].includes(experienceRating)) {
    return res.status(400).json({ message: "ratings must be between 1 and 5" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const renterId = await getRenterIdByUserId(pool, req.auth.sub);

    if (!renterId) {
      return res.status(403).json({ message: "renter profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT b.booking_id, b.vehicle_id, v.owner_id, COALESCE(b.status, 'pending') AS booking_status
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE b.booking_id = ? AND b.renter_id = ?
       LIMIT 1`,
      [bookingId, renterId]
    );

    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (booking.booking_status !== "completed") {
      return res.status(409).json({ message: "reviews can only be submitted for completed bookings" });
    }

    const [existingRows] = await pool.query("SELECT review_id FROM reviews WHERE booking_id = ? LIMIT 1", [bookingId]);
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "review already submitted for this booking" });
    }

    const [result] = await pool.query(
      `INSERT INTO reviews (
         booking_id, vehicle_id, renter_id, owner_id, car_rating, experience_rating, review_text
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, booking.vehicle_id, renterId, booking.owner_id, carRating, experienceRating, reviewText]
    );

    return res.status(201).json({
      message: "Review submitted successfully.",
      review: {
        reviewId: result.insertId,
        bookingId,
        carRating,
        experienceRating,
        reviewText,
      },
    });
  } catch (error) {
    console.error("Review submit error:", error);
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
