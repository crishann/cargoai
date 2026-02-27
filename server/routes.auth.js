const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getPool } = require("./db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
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
    const pool = getPool();
    const existing = await pool.query(
      "SELECT id FROM public.cargo_users WHERE username = $1 OR email = $2 LIMIT 1",
      [normalizedUsername, normalizedEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "username or email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO public.cargo_users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [normalizedUsername, normalizedEmail, passwordHash, normalizedRole]
    );

    const user = {
      id: result.rows[0].id,
      username: normalizedUsername,
      email: normalizedEmail,
      role: normalizedRole,
    };

    return res.status(201).json({ token: issueToken(user), user });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body || {};
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: "usernameOrEmail and password are required" });
  }

  try {
    const pool = getPool();
    const identifier = String(usernameOrEmail).trim();

    const result = await pool.query(
      `SELECT id, username, email, password_hash, role
       FROM public.cargo_users
       WHERE username = $1 OR email = $2
       LIMIT 1`,
      [identifier, identifier.toLowerCase()]
    );
    const rows = result.rows;

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
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
