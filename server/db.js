const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "3306",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "cargoai",
} = process.env;

const SUPER_ADMIN_USERNAME = "sadmin123";
const SUPER_ADMIN_PASSWORD = "sadmin123";
const SUPER_ADMIN_EMAIL = "sadmin123@cargoai.local";

let pool;
let databaseReady = false;
let initPromise = null;
let lastDatabaseError = null;

function createPool() {
  return {
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  };
}

async function initDatabase() {
  if (databaseReady && pool) return pool;
  if (initPromise) return initPromise;

  pool = mysql.createPool(createPool());
  initPromise = (async () => {
    try {
      await pool.query("SELECT 1");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`user\` (
          user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          username VARCHAR(50) NOT NULL,
          email VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('renter', 'owner', 'admin') NOT NULL DEFAULT 'renter',
          is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
          email_verification_token VARCHAR(128) DEFAULT NULL,
          email_verification_expires_at DATETIME DEFAULT NULL,
          email_verified_at DATETIME DEFAULT NULL,
          password_reset_token VARCHAR(128) DEFAULT NULL,
          password_reset_expires_at DATETIME DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id),
          UNIQUE KEY uq_user_username (username),
          UNIQUE KEY uq_user_email (email),
          UNIQUE KEY uq_user_email_verification_token (email_verification_token),
          UNIQUE KEY uq_user_password_reset_token (password_reset_token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await ensureUserVerificationColumns(pool);
      await ensureSuperAdmin(pool);
      databaseReady = true;
      lastDatabaseError = null;
      return pool;
    } catch (error) {
      databaseReady = false;
      lastDatabaseError = error;
      initPromise = null;
      if (pool) {
        await pool.end().catch(() => {});
      }
      pool = null;
      throw error;
    }
  })();

  return initPromise;
}

async function ensureSuperAdmin(poolInstance) {
  const [existingUsers] = await poolInstance.query(
    "SELECT user_id FROM `user` WHERE username = ? LIMIT 1",
    [SUPER_ADMIN_USERNAME]
  );

  if (existingUsers.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  await poolInstance.query(
    `INSERT INTO \`user\` (
       username,
       email,
       password_hash,
       role,
       is_email_verified,
       email_verified_at
     )
     VALUES (?, ?, ?, 'admin', 1, NOW())`,
    [SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, passwordHash]
  );
}

async function ensureUserVerificationColumns(poolInstance) {
  const [rows] = await poolInstance.query("SHOW COLUMNS FROM `user`");
  const columnNames = new Set(rows.map((row) => row.Field));

  if (!columnNames.has("is_email_verified")) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD COLUMN is_email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER role"
    );
  }

  if (!columnNames.has("email_verification_token")) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD COLUMN email_verification_token VARCHAR(128) DEFAULT NULL AFTER is_email_verified"
    );
  }

  if (!columnNames.has("email_verification_expires_at")) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD COLUMN email_verification_expires_at DATETIME DEFAULT NULL AFTER email_verification_token"
    );
  }

  if (!columnNames.has("email_verified_at")) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD COLUMN email_verified_at DATETIME DEFAULT NULL AFTER email_verification_expires_at"
    );
  }

  if (!columnNames.has("password_reset_token")) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD COLUMN password_reset_token VARCHAR(128) DEFAULT NULL AFTER email_verified_at"
    );
  }

  if (!columnNames.has("password_reset_expires_at")) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD COLUMN password_reset_expires_at DATETIME DEFAULT NULL AFTER password_reset_token"
    );
  }

  const [indexes] = await poolInstance.query("SHOW INDEX FROM `user` WHERE Key_name = 'uq_user_email_verification_token'");
  if (indexes.length === 0) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD UNIQUE KEY uq_user_email_verification_token (email_verification_token)"
    );
  }

  const [resetIndexes] = await poolInstance.query("SHOW INDEX FROM `user` WHERE Key_name = 'uq_user_password_reset_token'");
  if (resetIndexes.length === 0) {
    await poolInstance.query(
      "ALTER TABLE `user` ADD UNIQUE KEY uq_user_password_reset_token (password_reset_token)"
    );
  }

  await poolInstance.query(
    `UPDATE \`user\`
     SET is_email_verified = 1, email_verified_at = COALESCE(email_verified_at, created_at)
     WHERE role = 'admin' AND is_email_verified = 0`
  );
}

function getPool() {
  if (!pool) throw new Error("Database not initialized. Call initDatabase() first.");
  return pool;
}

function isDatabaseReady() {
  return databaseReady;
}

function getLastDatabaseError() {
  return lastDatabaseError;
}

module.exports = { initDatabase, getPool, isDatabaseReady, getLastDatabaseError };
