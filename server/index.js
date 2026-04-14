require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDatabase, isDatabaseReady, getLastDatabaseError } = require("./db");
const authRoutes = require("./routes.auth");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  const dbError = getLastDatabaseError();
  res.json({
    ok: true,
    databaseReady: isDatabaseReady(),
    databaseError: dbError ? dbError.message : null,
  });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "not found" });
});

async function start() {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  try {
    await initDatabase();
    console.log("Database connected");
  } catch (error) {
    console.error("Database unavailable during startup:", error.message);
  }
}

start();
