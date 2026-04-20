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

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "missing auth token" });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "invalid auth token" });
  }

  if (req.auth.role !== "admin") {
    return res.status(403).json({ message: "admin access required" });
  }

  next();
}

async function insertAudit(pool, userId, actionType, targetTable, targetId, details) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action_type, target_table, target_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, actionType, targetTable, targetId, details]
  );
}

router.get("/overview", requireAdmin, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();

    const [[usersRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total_users,
         SUM(account_status = 'active') AS active_users,
         SUM(role = 'owner' AND account_status = 'pending') AS pending_owner_accounts
       FROM \`user\``
    );
    const [[vehiclesRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total_vehicles,
         SUM(approval_status = 'pending') AS pending_vehicle_approvals
       FROM vehicles`
    );
    const [[bookingsRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total_bookings,
         SUM(status IN ('pending','confirmed','ongoing')) AS active_bookings
       FROM bookings`
    );
    const [[complaintsRow]] = await pool.query(
      `SELECT COUNT(*) AS open_complaints
       FROM complaints
       WHERE status IN ('open','in_review')`
    );
    const [inventoryRows] = await pool.query(
      `SELECT
         o.owner_id,
         u.user_id,
         u.username,
         u.email,
         o.company_name,
         COUNT(v.vehicle_id) AS total_vehicles,
         SUM(COALESCE(v.status, 'inactive') = 'available') AS available_vehicles,
         SUM(COALESCE(v.status, 'inactive') = 'booked') AS booked_vehicles,
         SUM(COALESCE(v.status, 'inactive') = 'maintenance') AS maintenance_vehicles,
         SUM(COALESCE(v.status, 'inactive') = 'inactive') AS inactive_vehicles
       FROM car_owners o
       INNER JOIN \`user\` u ON u.user_id = o.user_id
       LEFT JOIN vehicles v ON v.owner_id = o.owner_id
       GROUP BY o.owner_id, u.user_id, u.username, u.email, o.company_name
       ORDER BY COUNT(v.vehicle_id) DESC, u.username ASC`
    );

    return res.json({
      stats: {
        totalUsers: Number(usersRow.total_users || 0),
        activeUsers: Number(usersRow.active_users || 0),
        pendingOwnerAccounts: Number(usersRow.pending_owner_accounts || 0),
        totalVehicles: Number(vehiclesRow.total_vehicles || 0),
        pendingVehicleApprovals: Number(vehiclesRow.pending_vehicle_approvals || 0),
        totalBookings: Number(bookingsRow.total_bookings || 0),
        activeBookings: Number(bookingsRow.active_bookings || 0),
        openComplaints: Number(complaintsRow.open_complaints || 0),
      },
      inventory: inventoryRows.map((row) => ({
        ownerId: row.owner_id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        companyName: row.company_name || "",
        totalVehicles: Number(row.total_vehicles || 0),
        availableVehicles: Number(row.available_vehicles || 0),
        bookedVehicles: Number(row.booked_vehicles || 0),
        maintenanceVehicles: Number(row.maintenance_vehicles || 0),
        inactiveVehicles: Number(row.inactive_vehicles || 0),
      })),
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/owner-approvals", requireAdmin, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         o.owner_id,
         o.account_status,
         o.subscription_status,
         o.created_at,
         o.company_name,
         o.date_approved,
         u.user_id,
         u.username,
         u.email
       FROM car_owners o
       INNER JOIN \`user\` u ON u.user_id = o.user_id
       ORDER BY
         CASE o.account_status
           WHEN 'pending' THEN 0
           WHEN 'active' THEN 1
           WHEN 'suspended' THEN 2
           WHEN 'rejected' THEN 3
           ELSE 4
         END,
         o.created_at DESC`
    );

    return res.json({
      owners: rows.map((row) => ({
        ownerId: row.owner_id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        companyName: row.company_name || "",
        accountStatus: row.account_status,
        subscriptionStatus: row.subscription_status || "",
        createdAt: row.created_at,
        dateApproved: row.date_approved,
      })),
    });
  } catch (error) {
    console.error("Owner approvals fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/users", requireAdmin, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         u.user_id,
         u.username,
         u.email,
         u.role,
         u.is_email_verified,
         u.email_verified_at,
         u.account_status,
         u.last_login_at,
         u.created_at,
         o.owner_id,
         o.account_status AS owner_account_status,
         o.subscription_status,
         o.subscription_tier,
         o.company_name,
         o.date_approved,
         o.subscription_start_date,
         o.subscription_end_date,
         r.renter_id,
         r.government_id,
         r.address,
         r.phone_number
       FROM \`user\` u
       LEFT JOIN car_owners o ON o.user_id = u.user_id
       LEFT JOIN car_renter r ON r.user_id = u.user_id
       WHERE u.role IN ('owner', 'renter')
       ORDER BY
         CASE
           WHEN u.role = 'owner' AND o.account_status = 'pending' THEN 0
           WHEN u.account_status = 'suspended' THEN 1
           ELSE 2
         END,
         u.created_at DESC`
    );

    return res.json({
      users: rows.map((row) => ({
        userId: row.user_id,
        username: row.username,
        email: row.email,
        role: row.role,
        emailVerified: Boolean(row.is_email_verified),
        emailVerifiedAt: row.email_verified_at,
        userAccountStatus: row.account_status,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        owner: row.owner_id
          ? {
              ownerId: row.owner_id,
              accountStatus: row.owner_account_status,
              subscriptionStatus: row.subscription_status || "",
              subscriptionTier: row.subscription_tier || "",
              companyName: row.company_name || "",
              dateApproved: row.date_approved,
              subscriptionStartDate: row.subscription_start_date,
              subscriptionEndDate: row.subscription_end_date,
            }
          : null,
        renter: row.renter_id
          ? {
              renterId: row.renter_id,
              governmentId: row.government_id || "",
              address: row.address || "",
              phoneNumber: row.phone_number || "",
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/complaints", requireAdmin, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
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
         complainant.username AS complainant_username,
         complainant.email AS complainant_email,
         against_user.username AS against_username,
         against_user.email AS against_email,
         resolver.username AS resolved_by_username,
         CONCAT(v.brand, ' ', v.model) AS vehicle_label,
         v.plate_number,
         DATE_FORMAT(b.start_date, '%Y-%m-%d') AS booking_start_date,
         DATE_FORMAT(b.end_date, '%Y-%m-%d') AS booking_end_date
       FROM complaints c
       LEFT JOIN \`user\` complainant ON complainant.user_id = c.complainant_user_id
       LEFT JOIN \`user\` against_user ON against_user.user_id = c.against_user_id
       LEFT JOIN \`user\` resolver ON resolver.user_id = c.resolved_by_user_id
       LEFT JOIN bookings b ON b.booking_id = c.booking_id
       LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       ORDER BY
         CASE c.status
           WHEN 'open' THEN 0
           WHEN 'in_review' THEN 1
           WHEN 'resolved' THEN 2
           WHEN 'dismissed' THEN 3
           ELSE 4
         END,
         c.created_at DESC,
         c.complaint_id DESC`
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
        complainant: {
          username: row.complainant_username || "User",
          email: row.complainant_email || "",
        },
        againstUser: {
          username: row.against_username || "Account",
          email: row.against_email || "",
        },
        resolvedBy: row.resolved_by_username || "",
        booking: row.booking_id
          ? {
              bookingId: row.booking_id,
              vehicleLabel: row.vehicle_label || "Booking",
              plateNumber: row.plate_number || "",
              startDate: row.booking_start_date || "",
              endDate: row.booking_end_date || "",
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Admin complaints fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/car-inventory", requireAdmin, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         o.owner_id,
         u.user_id,
         u.username,
         u.email,
         o.company_name,
         v.vehicle_id,
         v.brand,
         v.model,
         v.car_type,
         v.year,
         v.seat_capacity,
         v.plate_number,
         v.rate_per_day,
         v.features,
         COALESCE(v.status, 'inactive') AS vehicle_status,
         v.approval_status,
         v.created_at
       FROM car_owners o
       INNER JOIN \`user\` u ON u.user_id = o.user_id
       LEFT JOIN vehicles v ON v.owner_id = o.owner_id
       ORDER BY u.username ASC, v.created_at DESC, v.vehicle_id DESC`
    );

    const owners = [];
    const ownerMap = new Map();

    for (const row of rows) {
      if (!ownerMap.has(row.owner_id)) {
        const owner = {
          ownerId: row.owner_id,
          userId: row.user_id,
          username: row.username,
          email: row.email,
          companyName: row.company_name || "",
          vehicles: [],
        };
        ownerMap.set(row.owner_id, owner);
        owners.push(owner);
      }

      if (row.vehicle_id) {
        ownerMap.get(row.owner_id).vehicles.push({
          vehicleId: row.vehicle_id,
          brand: row.brand,
          model: row.model,
          carType: row.car_type || "",
          year: row.year,
          seatCapacity: row.seat_capacity === null ? null : Number(row.seat_capacity),
          plateNumber: row.plate_number,
          ratePerDay: Number(row.rate_per_day || 0),
          features: row.features || "",
          status: row.vehicle_status,
          approvalStatus: row.approval_status,
          createdAt: row.created_at,
        });
      }
    }

    return res.json({ owners });
  } catch (error) {
    console.error("Admin car inventory error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/complaints/:complaintId", requireAdmin, async (req, res) => {
  const complaintId = Number(req.params.complaintId);
  const status = String(req.body?.status || "").trim().toLowerCase();
  const resolutionNotes = String(req.body?.resolutionNotes || "").trim();
  const allowedStatuses = new Set(["open", "in_review", "resolved", "dismissed"]);

  if (!Number.isInteger(complaintId) || complaintId <= 0) {
    return res.status(400).json({ message: "valid complaint id is required" });
  }

  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ message: "invalid complaint status" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT complaint_id, status FROM complaints WHERE complaint_id = ? LIMIT 1",
      [complaintId]
    );

    const complaint = rows[0];
    if (!complaint) {
      return res.status(404).json({ message: "complaint not found" });
    }

    await pool.query(
      `UPDATE complaints
       SET status = ?,
           resolution_notes = ?,
           resolved_by_user_id = CASE WHEN ? IN ('resolved', 'dismissed') THEN ? ELSE NULL END,
           resolved_at = CASE WHEN ? IN ('resolved', 'dismissed') THEN NOW() ELSE NULL END
       WHERE complaint_id = ?`,
      [status, resolutionNotes || null, status, req.auth.sub, status, complaintId]
    );

    await insertAudit(pool, req.auth.sub, "complaint_update", "complaints", complaintId, `Complaint moved from ${complaint.status} to ${status}`);

    return res.json({
      message: "complaint updated",
      complaintId,
      status,
      resolutionNotes,
    });
  } catch (error) {
    console.error("Admin complaint update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/subscriptions", requireAdmin, async (_req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         o.owner_id,
         o.user_id,
         o.account_status,
         o.subscription_status,
         o.subscription_tier,
         o.subscription_start_date,
         o.subscription_end_date,
         o.company_name,
         o.created_at,
         o.date_approved,
         u.username,
         u.email
       FROM car_owners o
       INNER JOIN \`user\` u ON u.user_id = o.user_id
       ORDER BY
         CASE COALESCE(o.subscription_status, 'inactive')
           WHEN 'pending' THEN 0
           WHEN 'active' THEN 1
           WHEN 'expired' THEN 2
           WHEN 'suspended' THEN 3
           ELSE 4
         END,
         o.created_at DESC`
    );

    return res.json({
      subscriptions: rows.map((row) => ({
        ownerId: row.owner_id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        companyName: row.company_name || "",
        accountStatus: row.account_status,
        subscriptionStatus: row.subscription_status || "inactive",
        subscriptionTier: row.subscription_tier || "",
        subscriptionStartDate: row.subscription_start_date,
        subscriptionEndDate: row.subscription_end_date,
        createdAt: row.created_at,
        dateApproved: row.date_approved,
      })),
    });
  } catch (error) {
    console.error("Admin subscriptions fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/subscriptions/:ownerId", requireAdmin, async (req, res) => {
  const ownerId = Number(req.params.ownerId);
  const subscriptionStatus = String(req.body?.subscriptionStatus || "").trim().toLowerCase();
  const subscriptionTier = String(req.body?.subscriptionTier || "").trim().toLowerCase();
  const durationDays = Number(req.body?.durationDays || 30);

  const allowedStatuses = new Set(["inactive", "pending", "active", "expired", "suspended"]);
  const allowedTiers = new Set(["starter", "growth", "fleet"]);

  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return res.status(400).json({ message: "valid owner id is required" });
  }

  if (!allowedStatuses.has(subscriptionStatus)) {
    return res.status(400).json({ message: "invalid subscription status" });
  }

  if (subscriptionTier && !allowedTiers.has(subscriptionTier)) {
    return res.status(400).json({ message: "invalid subscription tier" });
  }

  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    return res.status(400).json({ message: "durationDays must be greater than zero" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT owner_id, user_id, subscription_status, subscription_tier
         FROM car_owners
         WHERE owner_id = ?
         LIMIT 1`,
        [ownerId]
      );

      const owner = rows[0];
      if (!owner) {
        await connection.rollback();
        return res.status(404).json({ message: "owner account not found" });
      }

      const nextTier = subscriptionTier || owner.subscription_tier || null;
      const nextStartDate = subscriptionStatus === "active" ? new Date() : null;
      const nextEndDate = subscriptionStatus === "active"
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;

      await connection.query(
        `UPDATE car_owners
         SET subscription_status = ?, subscription_tier = ?, subscription_start_date = ?, subscription_end_date = ?
         WHERE owner_id = ?`,
        [subscriptionStatus, nextTier, nextStartDate, nextEndDate, ownerId]
      );

      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'system', ?, ?, 'car_owners', ?)`,
        [
          owner.user_id,
          "Subscription status updated",
          `Your subscription is now ${subscriptionStatus}${nextTier ? ` under the ${nextTier} plan` : ""}.`,
          ownerId,
        ]
      );

      await insertAudit(
        connection,
        req.auth.sub,
        `subscription_${subscriptionStatus}`,
        "car_owners",
        ownerId,
        nextTier ? `tier:${nextTier};durationDays:${durationDays}` : `durationDays:${durationDays}`
      );

      await connection.commit();
      return res.json({
        message: "Subscription updated successfully.",
        ownerId,
        subscriptionStatus,
        subscriptionTier: nextTier,
        subscriptionStartDate: nextStartDate,
        subscriptionEndDate: nextEndDate,
      });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Admin subscription update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/owner-approvals/:ownerId", requireAdmin, async (req, res) => {
  const ownerId = Number(req.params.ownerId);
  const decision = String(req.body?.decision || "").trim().toLowerCase();
  const notes = String(req.body?.notes || "").trim() || null;
  const allowed = new Set(["approved", "rejected", "suspended", "reactivated"]);

  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return res.status(400).json({ message: "valid owner id is required" });
  }

  if (!allowed.has(decision)) {
    return res.status(400).json({ message: "invalid owner approval decision" });
  }

  const nextOwnerStatus =
    decision === "approved" || decision === "reactivated"
      ? "active"
      : decision === "suspended"
        ? "suspended"
        : "rejected";

  const nextUserStatus = nextOwnerStatus === "rejected" ? "disabled" : nextOwnerStatus;

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT o.owner_id, o.user_id, o.account_status, u.username, u.email
         FROM car_owners o
         INNER JOIN \`user\` u ON u.user_id = o.user_id
         WHERE o.owner_id = ?
         LIMIT 1`,
        [ownerId]
      );

      const owner = rows[0];
      if (!owner) {
        await connection.rollback();
        return res.status(404).json({ message: "owner account not found" });
      }

      await connection.query(
        `UPDATE car_owners
         SET account_status = ?, date_approved = CASE WHEN ? = 'active' THEN COALESCE(date_approved, NOW()) ELSE date_approved END
         WHERE owner_id = ?`,
        [nextOwnerStatus, nextOwnerStatus, ownerId]
      );

      await connection.query(
        "UPDATE `user` SET account_status = ? WHERE user_id = ?",
        [nextUserStatus, owner.user_id]
      );

      await connection.query(
        `INSERT INTO owner_approval_logs (owner_id, reviewed_by_user_id, decision, notes)
         VALUES (?, ?, ?, ?)`,
        [ownerId, req.auth.sub, decision, notes]
      );

      await connection.query(
        `INSERT INTO user_status_logs (user_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [owner.user_id, owner.account_status === "rejected" ? "disabled" : owner.account_status, nextUserStatus, req.auth.sub, notes]
      );

      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'system', ?, ?, 'car_owners', ?)`,
        [
          owner.user_id,
          "Owner account review update",
          `Your owner account status is now ${nextOwnerStatus}.`,
          ownerId,
        ]
      );

      await insertAudit(connection, req.auth.sub, `owner_${decision}`, "car_owners", ownerId, notes);
      await connection.commit();

      return res.json({ message: `Owner account ${decision}.`, ownerId, accountStatus: nextOwnerStatus });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Owner approval update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/users/:userId/status", requireAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const status = String(req.body?.status || "").trim().toLowerCase();
  const notes = String(req.body?.notes || "").trim() || null;
  const allowed = new Set(["active", "suspended"]);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "valid user id is required" });
  }

  if (!allowed.has(status)) {
    return res.status(400).json({ message: "invalid user status" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT user_id, username, email, role, account_status
         FROM \`user\`
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
      );

      const user = rows[0];
      if (!user) {
        await connection.rollback();
        return res.status(404).json({ message: "user not found" });
      }

      if (user.role !== "renter") {
        await connection.rollback();
        return res.status(409).json({ message: "direct status updates are only available for customer accounts" });
      }

      await connection.query("UPDATE `user` SET account_status = ? WHERE user_id = ?", [status, userId]);
      await connection.query(
        `INSERT INTO user_status_logs (user_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, user.account_status, status, req.auth.sub, notes]
      );
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'system', ?, ?, 'user', ?)`,
        [
          userId,
          "Account status updated",
          `Your account status is now ${status}.`,
          userId,
        ]
      );

      await insertAudit(connection, req.auth.sub, `user_${status}`, "user", userId, notes);
      await connection.commit();

      return res.json({ message: `User marked ${status}.`, userId, accountStatus: status });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("User status update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/vehicle-approvals", requireAdmin, async (_req, res) => {
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
         v.approval_status,
         v.status,
         v.created_at,
         o.owner_id,
         u.username AS owner_username,
         u.email AS owner_email
       FROM vehicles v
       INNER JOIN car_owners o ON o.owner_id = v.owner_id
       INNER JOIN \`user\` u ON u.user_id = o.user_id
       ORDER BY
         CASE v.approval_status
           WHEN 'pending' THEN 0
           WHEN 'approved' THEN 1
           WHEN 'rejected' THEN 2
           ELSE 3
         END,
         v.created_at DESC`
    );

    return res.json({
      vehicles: rows.map((row) => ({
        vehicleId: row.vehicle_id,
        ownerId: row.owner_id,
        ownerUsername: row.owner_username,
        ownerEmail: row.owner_email,
        label: `${row.brand} ${row.model}`.trim(),
        year: row.year,
        plateNumber: row.plate_number,
        approvalStatus: row.approval_status,
        vehicleStatus: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Vehicle approvals fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/vehicle-approvals/:vehicleId", requireAdmin, async (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const decision = String(req.body?.decision || "").trim().toLowerCase();
  const notes = String(req.body?.notes || "").trim() || null;
  const allowed = new Set(["approved", "rejected", "suspended", "reactivated"]);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return res.status(400).json({ message: "valid vehicle id is required" });
  }

  if (!allowed.has(decision)) {
    return res.status(400).json({ message: "invalid vehicle approval decision" });
  }

  const nextApprovalStatus =
    decision === "approved" || decision === "reactivated" ? "approved" : "rejected";
  const nextVehicleStatus =
    decision === "approved" || decision === "reactivated"
      ? "available"
      : decision === "suspended"
        ? "inactive"
        : "inactive";

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT v.vehicle_id, v.owner_id, o.user_id, v.approval_status
         FROM vehicles v
         INNER JOIN car_owners o ON o.owner_id = v.owner_id
         WHERE v.vehicle_id = ?
         LIMIT 1`,
        [vehicleId]
      );

      const vehicle = rows[0];
      if (!vehicle) {
        await connection.rollback();
        return res.status(404).json({ message: "vehicle not found" });
      }

      await connection.query(
        "UPDATE vehicles SET approval_status = ?, status = ? WHERE vehicle_id = ?",
        [nextApprovalStatus, nextVehicleStatus, vehicleId]
      );

      await connection.query(
        `INSERT INTO vehicle_approval_logs (vehicle_id, reviewed_by_user_id, decision, notes)
         VALUES (?, ?, ?, ?)`,
        [vehicleId, req.auth.sub, decision, notes]
      );

      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'system', ?, ?, 'vehicles', ?)`,
        [
          vehicle.user_id,
          "Vehicle listing review update",
          `Your vehicle listing is now ${nextApprovalStatus}.`,
          vehicleId,
        ]
      );

      await insertAudit(connection, req.auth.sub, `vehicle_${decision}`, "vehicles", vehicleId, notes);
      await connection.commit();

      return res.json({ message: `Vehicle ${decision}.`, vehicleId, approvalStatus: nextApprovalStatus });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Vehicle approval update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
