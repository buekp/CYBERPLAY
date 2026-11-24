
const express = require("express");
const cors = require("cors");
const db = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to CYBERPLAY API!",
    status: "Server is running"
  });
});

app.get("/api/health", (req, res) => {
  try {
    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    `).all();

    res.json({
      status: "healthy",
      server: "online",
      database: "connected",
      tables: tables.map(table => table.name)
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected"
    });
  }
});

app.listen(PORT, () => {
  console.log(`CYBERPLAY API running at http://localhost:${PORT}`);
});
