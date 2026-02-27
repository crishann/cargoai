require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./db");
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
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "not found" });
});

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
