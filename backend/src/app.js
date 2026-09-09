const express = require("express");
const cors = require("cors");

const destinationsRoutes = require("./routes/destinations");
const statsRoutes = require("./routes/stats");
const forecastRoutes = require("./routes/forecast");
const authRoutes = require("./routes/auth");
const analyticsRoutes = require("./routes/analytics");
const modelRoutes = require("./routes/models");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/destinations", destinationsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

module.exports = app;
