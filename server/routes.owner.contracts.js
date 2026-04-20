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
  const [rows] = await pool.query("SELECT owner_id FROM car_owners WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.owner_id || null;
}

async function getOwnerTemplate(pool, ownerId) {
  const [rows] = await pool.query(
    `SELECT owner_contract_template_id, template_title, terms_and_conditions, security_deposit, updated_at
     FROM owner_contract_templates
     WHERE owner_id = ?
     LIMIT 1`,
    [ownerId]
  );

  const template = rows[0];
  if (!template) return null;

  return {
    templateId: template.owner_contract_template_id,
    templateTitle: template.template_title || "Rental Agreement",
    termsAndConditions: template.terms_and_conditions || "",
    securityDeposit: Number(template.security_deposit || 0),
    updatedAt: template.updated_at,
  };
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
         b.status AS booking_status,
         v.brand,
         v.model,
         v.plate_number,
         r.renter_id,
         u.username AS renter_username,
         u.email AS renter_email,
         c.contract_id,
         c.contract_number,
         c.status AS contract_status,
         c.terms_and_conditions,
         c.security_deposit,
         c.released_at,
         c.signed_at,
         c.created_at AS contract_created_at
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       INNER JOIN car_renter r ON r.renter_id = b.renter_id
       INNER JOIN \`user\` u ON u.user_id = r.user_id
       LEFT JOIN contracts c ON c.booking_id = b.booking_id
       WHERE v.owner_id = ?
         AND COALESCE(b.status, 'pending') IN ('confirmed', 'ongoing', 'completed')
       ORDER BY b.start_date DESC, b.booking_id DESC`,
      [ownerId]
    );

    const template = await getOwnerTemplate(pool, ownerId);

    return res.json({
      ownerId,
      template,
      contracts: rows.map((row) => ({
        bookingId: row.booking_id,
        bookingStatus: row.booking_status,
        renterId: row.renter_id,
        renterName: row.renter_username,
        renterEmail: row.renter_email,
        vehicleLabel: `${row.brand} ${row.model}`.trim(),
        plateNumber: row.plate_number,
        startDate: row.start_date,
        endDate: row.end_date,
        pickupLocation: row.pickup_location,
        dropoffLocation: row.dropoff_location,
        totalCost: Number(row.total_cost),
        contract: row.contract_id
          ? {
              contractId: row.contract_id,
              contractNumber: row.contract_number,
              status: row.contract_status,
              termsAndConditions: row.terms_and_conditions || "",
              securityDeposit: Number(row.security_deposit || 0),
              releasedAt: row.released_at,
              signedAt: row.signed_at,
              createdAt: row.contract_created_at,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Owner contracts error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const bookingId = Number(req.body?.bookingId);
  const termsAndConditions = String(req.body?.termsAndConditions || "").trim();
  const securityDeposit = Number(req.body?.securityDeposit || 0);

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

    const [bookingRows] = await pool.query(
      `SELECT booking_id, renter_id
       FROM bookings b
       INNER JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE b.booking_id = ? AND v.owner_id = ?
       LIMIT 1`,
      [bookingId, ownerId]
    );

    const booking = bookingRows[0];
    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    const [existing] = await pool.query(
      "SELECT contract_id FROM contracts WHERE booking_id = ? LIMIT 1",
      [bookingId]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE contracts
         SET terms_and_conditions = ?, security_deposit = ?, updated_at = NOW()
         WHERE contract_id = ?`,
        [termsAndConditions, securityDeposit, existing[0].contract_id]
      );

      return res.json({ message: "Contract updated.", contractId: existing[0].contract_id });
    }

    const contractNumber = `CT-${bookingId}-${Date.now()}`;
    const [result] = await pool.query(
      `INSERT INTO contracts (
         booking_id, owner_id, renter_id, contract_number, status, terms_and_conditions, security_deposit, created_by_user_id
       ) VALUES (?, ?, ?, ?, 'prepared', ?, ?, ?)`,
      [bookingId, ownerId, booking.renter_id, contractNumber, termsAndConditions, securityDeposit, req.auth.sub]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
       VALUES (?, 'system', 'Rental contract prepared', 'Your rental contract is ready for review.', 'contracts', ?)`,
      [req.auth.sub, result.insertId]
    );

    return res.status(201).json({ message: "Contract created.", contractId: result.insertId });
  } catch (error) {
    console.error("Create contract error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.put("/template", requireAuth, async (req, res) => {
  const templateTitle = String(req.body?.templateTitle || "").trim() || "Rental Agreement";
  const termsAndConditions = String(req.body?.termsAndConditions || "").trim();
  const securityDeposit = Number(req.body?.securityDeposit || 0);

  if (!termsAndConditions) {
    return res.status(400).json({ message: "template terms and conditions are required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [existingRows] = await pool.query(
      "SELECT owner_contract_template_id FROM owner_contract_templates WHERE owner_id = ? LIMIT 1",
      [ownerId]
    );

    if (existingRows.length > 0) {
      await pool.query(
        `UPDATE owner_contract_templates
         SET template_title = ?, terms_and_conditions = ?, security_deposit = ?, updated_by_user_id = ?, updated_at = NOW()
         WHERE owner_contract_template_id = ?`,
        [templateTitle, termsAndConditions, securityDeposit, req.auth.sub, existingRows[0].owner_contract_template_id]
      );
    } else {
      await pool.query(
        `INSERT INTO owner_contract_templates (
           owner_id, template_title, terms_and_conditions, security_deposit, updated_by_user_id
         ) VALUES (?, ?, ?, ?, ?)`,
        [ownerId, templateTitle, termsAndConditions, securityDeposit, req.auth.sub]
      );
    }

    const template = await getOwnerTemplate(pool, ownerId);
    return res.json({ message: "Contract template saved.", template });
  } catch (error) {
    console.error("Owner contract template save error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/:contractId/status", requireAuth, async (req, res) => {
  const contractId = Number(req.params.contractId);
  const status = String(req.body?.status || "").trim().toLowerCase();
  const allowed = new Set(["prepared", "released", "signed", "completed", "cancelled"]);

  if (!Number.isInteger(contractId) || contractId <= 0) {
    return res.status(400).json({ message: "valid contract id is required" });
  }

  if (!allowed.has(status)) {
    return res.status(400).json({ message: "invalid contract status" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      "SELECT contract_id, renter_id FROM contracts WHERE contract_id = ? AND owner_id = ? LIMIT 1",
      [contractId, ownerId]
    );

    const contract = rows[0];
    if (!contract) {
      return res.status(404).json({ message: "contract not found" });
    }

    await pool.query(
      `UPDATE contracts
       SET status = ?,
           released_at = CASE WHEN ? = 'released' THEN COALESCE(released_at, NOW()) ELSE released_at END,
           signed_at = CASE WHEN ? = 'signed' THEN COALESCE(signed_at, NOW()) ELSE signed_at END,
           completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END
       WHERE contract_id = ?`,
      [status, status, status, status, contractId]
    );

    return res.json({ message: "Contract status updated.", contractId, status });
  } catch (error) {
    console.error("Contract status update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
