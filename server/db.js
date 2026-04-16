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
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id),
          UNIQUE KEY uq_user_username (username),
          UNIQUE KEY uq_user_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
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
    `INSERT INTO \`user\` (username, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')`,
    [SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, passwordHash]
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
