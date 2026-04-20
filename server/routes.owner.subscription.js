const express = require("express");
const jwt = require("jsonwebtoken");
const { getPool, initDatabase } = require("./db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

const PLAN_CATALOG = [
  {
    tier: "starter",
    label: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    vehicleLimit: 3,
    supportLevel: "Email support",
    features: ["Up to 3 active vehicles", "Basic booking tools", "Owner dashboard access"],
  },
  {
    tier: "growth",
    label: "Growth",
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    vehicleLimit: 10,
    supportLevel: "Priority support",
    features: ["Up to 10 active vehicles", "Contract and payment tracking", "Priority owner support"],
  },
  {
    tier: "fleet",
    label: "Fleet",
    monthlyPrice: 3499,
    yearlyPrice: 34990,
    vehicleLimit: null,
    supportLevel: "Dedicated support",
    features: ["Unlimited vehicles", "Advanced operations support", "Dedicated owner success support"],
  },
];

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

function normalizeSubscriptionStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized || "inactive";
}

function serializePlan(plan) {
  return {
    ...plan,
    currency: "PHP",
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         o.owner_id,
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
       WHERE o.user_id = ?
       LIMIT 1`,
      [req.auth.sub]
    );

    const owner = rows[0];
    if (!owner) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    return res.json({
      owner: {
        ownerId: owner.owner_id,
        username: owner.username,
        email: owner.email,
        companyName: owner.company_name || "",
        accountStatus: owner.account_status,
        subscriptionStatus: normalizeSubscriptionStatus(owner.subscription_status),
        subscriptionTier: owner.subscription_tier || "",
        subscriptionStartDate: owner.subscription_start_date,
        subscriptionEndDate: owner.subscription_end_date,
        createdAt: owner.created_at,
        dateApproved: owner.date_approved,
      },
      plans: PLAN_CATALOG.map(serializePlan),
    });
  } catch (error) {
    console.error("Owner subscription fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/request", requireAuth, async (req, res) => {
  const tier = String(req.body?.tier || "").trim().toLowerCase();
  const cycle = String(req.body?.cycle || "monthly").trim().toLowerCase();
  const allowedTiers = new Set(PLAN_CATALOG.map((plan) => plan.tier));
  const allowedCycles = new Set(["monthly", "yearly"]);

  if (!allowedTiers.has(tier)) {
    return res.status(400).json({ message: "valid subscription tier is required" });
  }

  if (!allowedCycles.has(cycle)) {
    return res.status(400).json({ message: "valid billing cycle is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT owner_id, account_status, subscription_status, subscription_tier
         FROM car_owners
         WHERE user_id = ?
         LIMIT 1`,
        [req.auth.sub]
      );

      const owner = rows[0];
      if (!owner) {
        await connection.rollback();
        return res.status(403).json({ message: "owner profile not found" });
      }

      if (owner.account_status !== "active") {
        await connection.rollback();
        return res.status(409).json({ message: "owner account must be active before requesting a subscription" });
      }

      await connection.query(
        `UPDATE car_owners
         SET subscription_status = ?, subscription_tier = ?, subscription_start_date = NULL, subscription_end_date = NULL
         WHERE owner_id = ?`,
        ["pending", tier, owner.owner_id]
      );

      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'system', ?, ?, 'car_owners', ?)`,
        [
          req.auth.sub,
          "Subscription request submitted",
          `Your ${tier} ${cycle} subscription request is pending admin review.`,
          owner.owner_id,
        ]
      );

      await connection.query(
        `INSERT INTO audit_logs (user_id, action_type, target_table, target_id, details)
         VALUES (?, 'owner_subscription_requested', 'car_owners', ?, ?)`,
        [req.auth.sub, owner.owner_id, `${tier}:${cycle}`]
      );

      await connection.commit();
      return res.status(201).json({
        message: "Subscription request submitted for admin review.",
        subscriptionStatus: "pending",
        subscriptionTier: tier,
        billingCycle: cycle,
      });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Owner subscription request error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
