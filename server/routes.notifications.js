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

router.get("/", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT notification_id, type, title, message, related_table, related_id, is_read, created_at, read_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY is_read ASC, created_at DESC, notification_id DESC`,
      [req.auth.sub]
    );

    return res.json({
      notifications: rows.map((row) => ({
        notificationId: row.notification_id,
        type: row.type,
        title: row.title,
        message: row.message,
        relatedTable: row.related_table,
        relatedId: row.related_id,
        isRead: Boolean(row.is_read),
        createdAt: row.created_at,
        readAt: row.read_at,
      })),
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/:notificationId/read", requireAuth, async (req, res) => {
  const notificationId = Number(req.params.notificationId);

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ message: "valid notification id is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE notifications
       SET is_read = 1, read_at = COALESCE(read_at, NOW())
       WHERE notification_id = ? AND user_id = ?`,
      [notificationId, req.auth.sub]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "notification not found" });
    }

    return res.json({ message: "notification marked as read", notificationId });
  } catch (error) {
    console.error("Notification read error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
