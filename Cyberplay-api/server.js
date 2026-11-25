const express = require("express");
const cors = require("cors");
const session = require("express-session");
const SQLiteSessionStore = require("./sessionStore");
const authRoutes = require("./routes/auth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from the environment configuration.");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json({ limit: "10kb" }));

const sessionStore = new SQLiteSessionStore();

app.use(session({
  name: "cyberplay.sid",
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const cleanupInterval = setInterval(() => {
  try {
    sessionStore.cleanup();
  } catch (error) {
    console.error("Session cleanup failed:", error);
  }
}, 60 * 60 * 1000);

cleanupInterval.unref();

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to CYBERPLAY API!",
    status: "Server is running"
  });
});

app.get("/api/health", (req, res) => {
  try {
    const tables = require("./db").prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    `).all();

    res.json({
      status: "healthy",
      server: "online",
      database: "connected",
      sessionStore: "connected",
      tables: tables.map(table => table.name)
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      status: "error",
      message: "A backend dependency is unavailable."
    });
  }
});

app.use("/api/auth", authRoutes);

app.use((error, req, res, next) => {
  console.error("API error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "An unexpected server error occurred."
  });
});

app.listen(PORT, () => {
  console.log(`CYBERPLAY API running at http://localhost:${PORT}`);
});
