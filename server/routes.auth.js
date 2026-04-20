const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { getPool, initDatabase } = require("./db");
const { isMailConfigured, sendVerificationEmail, sendPasswordResetEmail } = require("./mailer");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const VERIFICATION_WINDOW_HOURS = 24;
const PASSWORD_RESET_WINDOW_HOURS = 1;

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

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
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

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createExpiry(hours) {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

async function storeVerificationToken(connection, userId) {
  const token = createVerificationToken();
  const expiresAt = createExpiry(VERIFICATION_WINDOW_HOURS);

  await connection.query(
    `UPDATE \`user\`
     SET email_verification_token = ?, email_verification_expires_at = ?, is_email_verified = 0, email_verified_at = NULL
     WHERE user_id = ?`,
    [token, expiresAt, userId]
  );

  return { token, expiresAt };
}

async function storePasswordResetToken(connection, userId) {
  const token = createVerificationToken();
  const expiresAt = createExpiry(PASSWORD_RESET_WINDOW_HOURS);

  await connection.query(
    `UPDATE \`user\`
     SET password_reset_token = ?, password_reset_expires_at = ?
     WHERE user_id = ?`,
    [token, expiresAt, userId]
  );

  return { token, expiresAt };
}

router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ message: "username, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "password must be at least 6 characters" });
  }

  const normalizedRole = role === "owner" ? "owner" : "renter";
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();

  if (!isMailConfigured()) {
    return res.status(503).json({ message: "email service is not configured" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        "SELECT user_id FROM `user` WHERE username = ? OR email = ? LIMIT 1",
        [normalizedUsername, normalizedEmail]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "username or email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await connection.query(
        `INSERT INTO \`user\` (
           username,
           email,
           password_hash,
           role,
           is_email_verified,
           email_verification_token,
           email_verification_expires_at,
           email_verified_at
         )
         VALUES (?, ?, ?, ?, 0, NULL, NULL, NULL)`,
        [normalizedUsername, normalizedEmail, passwordHash, normalizedRole]
      );

      const userId = result.insertId;

      if (normalizedRole === "owner") {
        await connection.query(
          `INSERT INTO car_owners (
             user_id,
             subscription_status,
             subscription_tier,
             company_name,
             date_approved,
             subscription_start_date,
             subscription_end_date
           )
           VALUES (?, 'inactive', NULL, NULL, NULL, NULL, NULL)`,
          [userId]
        );
      } else {
        await connection.query(
          `INSERT INTO car_renter (
             user_id,
             government_id,
             address,
             phone_number
           )
           VALUES (?, NULL, NULL, NULL)`,
          [userId]
        );
      }

      const verification = await storeVerificationToken(connection, userId);

      await connection.commit();
      await sendVerificationEmail({
        email: normalizedEmail,
        username: normalizedUsername,
        token: verification.token,
      });

      return res.status(201).json({
        message: "Registration successful. Please check your email to verify your account.",
        requiresEmailVerification: true,
        email: normalizedEmail,
      });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Register error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body || {};
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: "usernameOrEmail and password are required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const identifier = String(usernameOrEmail).trim();

    const [rows] = await pool.query(
      `SELECT user_id AS id, username, email, password_hash, role, is_email_verified
       FROM \`user\`
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [identifier, identifier.toLowerCase()]
    );

    if (rows.length === 0) return res.status(401).json({ message: "invalid credentials" });

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: "invalid credentials" });
    if (!user.is_email_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return res.json({ token: issueToken(safeUser), user: safeUser });
  } catch (error) {
    console.error("Login error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/account", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         u.user_id AS id,
         u.username,
         u.email,
         u.role,
         u.account_status,
         u.is_email_verified,
         u.email_verified_at,
         r.renter_id,
         r.government_id,
         r.address,
         r.phone_number
       FROM \`user\` u
       LEFT JOIN car_renter r ON r.user_id = u.user_id
       WHERE u.user_id = ?
       LIMIT 1`,
      [req.auth.sub]
    );

    const account = rows[0];
    if (!account) {
      return res.status(404).json({ message: "account not found" });
    }

    return res.json({
      account: {
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role,
        accountStatus: account.account_status,
        emailVerified: Boolean(account.is_email_verified),
        emailVerifiedAt: account.email_verified_at,
        renterId: account.renter_id || null,
        governmentId: account.government_id || "",
        address: account.address || "",
        phoneNumber: account.phone_number || "",
      },
    });
  } catch (error) {
    console.error("Get account error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/account", requireAuth, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const governmentId = String(req.body?.governmentId || "").trim();
  const address = String(req.body?.address || "").trim();
  const phoneNumber = String(req.body?.phoneNumber || "").trim();

  if (!username || !email) {
    return res.status(400).json({ message: "username and email are required" });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: "a valid email is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [userRows] = await connection.query(
        `SELECT user_id, role, is_email_verified
         FROM \`user\`
         WHERE user_id = ?
         LIMIT 1`,
        [req.auth.sub]
      );

      const user = userRows[0];
      if (!user) {
        await connection.rollback();
        return res.status(404).json({ message: "account not found" });
      }

      const [duplicateRows] = await connection.query(
        `SELECT user_id
         FROM \`user\`
         WHERE (username = ? OR email = ?)
           AND user_id <> ?
         LIMIT 1`,
        [username, email, req.auth.sub]
      );

      if (duplicateRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "username or email already exists" });
      }

      await connection.query(
        `UPDATE \`user\`
         SET username = ?, email = ?
         WHERE user_id = ?`,
        [username, email, req.auth.sub]
      );

      const [renterRows] = await connection.query(
        "SELECT renter_id FROM car_renter WHERE user_id = ? LIMIT 1",
        [req.auth.sub]
      );

      if (renterRows.length > 0) {
        await connection.query(
          `UPDATE car_renter
           SET government_id = ?, address = ?, phone_number = ?
           WHERE user_id = ?`,
          [governmentId || null, address || null, phoneNumber || null, req.auth.sub]
        );
      }

      const [accountRows] = await connection.query(
        `SELECT
           u.user_id AS id,
           u.username,
           u.email,
           u.role,
           u.account_status,
           u.is_email_verified,
           u.email_verified_at,
           r.renter_id,
           r.government_id,
           r.address,
           r.phone_number
         FROM \`user\` u
         LEFT JOIN car_renter r ON r.user_id = u.user_id
         WHERE u.user_id = ?
         LIMIT 1`,
        [req.auth.sub]
      );

      await connection.commit();

      const account = accountRows[0];
      const safeUser = {
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role,
      };

      return res.json({
        message: "account updated",
        token: issueToken(safeUser),
        user: safeUser,
        account: {
          id: account.id,
          username: account.username,
          email: account.email,
          role: account.role,
          accountStatus: account.account_status,
          emailVerified: Boolean(account.is_email_verified),
          emailVerifiedAt: account.email_verified_at,
          renterId: account.renter_id || null,
          governmentId: account.government_id || "",
          address: account.address || "",
          phoneNumber: account.phone_number || "",
        },
      });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update account error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/verify-email", async (req, res) => {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.status(400).json({ message: "verification token is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT user_id AS id, username, email, role, email_verification_expires_at
       FROM \`user\`
       WHERE email_verification_token = ?
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "invalid verification token" });
    }

    const user = rows[0];
    if (!user.email_verification_expires_at || new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ message: "verification link has expired" });
    }

    await pool.query(
      `UPDATE \`user\`
       SET is_email_verified = 1,
           email_verified_at = NOW(),
           email_verification_token = NULL,
           email_verification_expires_at = NULL
       WHERE user_id = ?`,
      [user.id]
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return res.json({
      message: "Email verified successfully.",
      token: issueToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    console.error("Verify email error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/resend-verification", async (req, res) => {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ message: "email is required" });
  }

  if (!isMailConfigured()) {
    return res.status(503).json({ message: "email service is not configured" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT user_id AS id, username, email, is_email_verified
         FROM \`user\`
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "account not found" });
      }

      const user = rows[0];
      if (user.is_email_verified) {
        await connection.rollback();
        return res.status(400).json({ message: "email is already verified" });
      }

      const verification = await storeVerificationToken(connection, user.id);
      await connection.commit();

      await sendVerificationEmail({
        email: user.email,
        username: user.username,
        token: verification.token,
      });

      return res.json({ message: "Verification email sent." });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ message: "email is required" });
  }

  if (!isMailConfigured()) {
    return res.status(503).json({ message: "email service is not configured" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT user_id AS id, username, email
         FROM \`user\`
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.json({ message: "If that email exists, a reset link has been sent." });
      }

      const user = rows[0];
      const reset = await storePasswordResetToken(connection, user.id);
      await connection.commit();

      await sendPasswordResetEmail({
        email: user.email,
        username: user.username,
        token: reset.token,
      });

      return res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");

  if (!token || !password) {
    return res.status(400).json({ message: "token and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "password must be at least 6 characters" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT user_id AS id, password_reset_expires_at
       FROM \`user\`
       WHERE password_reset_token = ?
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "invalid reset token" });
    }

    const user = rows[0];
    if (!user.password_reset_expires_at || new Date(user.password_reset_expires_at) < new Date()) {
      return res.status(400).json({ message: "reset link has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE \`user\`
       SET password_hash = ?,
           password_reset_token = NULL,
           password_reset_expires_at = NULL
       WHERE user_id = ?`,
      [passwordHash, user.id]
    );

    return res.json({ message: "Password reset successful. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
