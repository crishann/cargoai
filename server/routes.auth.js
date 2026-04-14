const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getPool, initDatabase } = require("./db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

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
        `INSERT INTO \`user\` (username, email, password_hash, role)
         VALUES (?, ?, ?, ?)`,
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

      await connection.commit();

      const user = {
        id: userId,
        username: normalizedUsername,
        email: normalizedEmail,
        role: normalizedRole,
      };

      return res.status(201).json({ token: issueToken(user), user });
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
      `SELECT user_id AS id, username, email, password_hash, role
       FROM \`user\`
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [identifier, identifier.toLowerCase()]
    );

    if (rows.length === 0) return res.status(401).json({ message: "invalid credentials" });

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: "invalid credentials" });

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

module.exports = router;
