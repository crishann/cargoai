const { Pool } = require("pg");

const {
  DATABASE_URL,
  PGHOST = "localhost",
  PGPORT = "5432",
  PGUSER = "postgres",
  PGPASSWORD = "",
  PGDATABASE = "postgres",
  DB_SSL = "true",
} = process.env;

let pool;

function createPoolConfig() {
  if (DATABASE_URL) {
    return {
      connectionString: DATABASE_URL,
      ssl: DB_SSL === "false" ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    };
  }

  return {
    host: PGHOST,
    port: Number(PGPORT),
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    ssl: DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  };
}

async function initDatabase() {
  pool = new Pool(createPoolConfig());

  await pool.query("SELECT 1");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.cargo_users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'renter',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cargo_users_role_check CHECK (role IN ('renter', 'owner', 'admin'))
    )
  `);
}

function getPool() {
  if (!pool) throw new Error("Database not initialized. Call initDatabase() first.");
  return pool;
}

module.exports = { initDatabase, getPool };
