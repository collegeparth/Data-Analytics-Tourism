const express = require("express");
const router = express.Router();
const store = require("../data/store");
const { analyzeWeatherCorrelation } = require("../services/correlationEngine");
const { clusterDestinations } = require("../services/clusteringEngine");

// GET /api/analytics/correlation/:destinationId
// Pearson correlation between weather (temperature, rainfall) and visitor counts
router.get("/correlation/:destinationId", (req, res) => {
  try {
    const visitorStats = store.getAllHistory(req.params.destinationId);
    const weatherRecords = store.getWeatherHistory(req.params.destinationId);

    if (!visitorStats.length || !weatherRecords.length) {
      return res.status(404).json({ message: "Not enough data for this destination." });
    }

    const result = analyzeWeatherCorrelation(visitorStats, weatherRecords);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/analytics/clusters?k=3
// K-Means clustering of all destinations by demand pattern
router.get("/clusters", (req, res) => {
  try {
    const k = Number(req.query.k) || 3;
    const destinations = store.getDestinations();

    const destinationsWithHistory = destinations.map((d) => ({
      destinationId: d._id,
      name: d.name,
      visitorStats: store.getAllHistory(d._id),
    }));

    const result = clusterDestinations(destinationsWithHistory, k);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
