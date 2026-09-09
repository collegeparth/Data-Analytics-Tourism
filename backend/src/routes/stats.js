const express = require("express");
const router = express.Router();
const store = require("../data/store");
const { getLatestModelSummary } = require("../services/modelRegistry");

// GET /api/stats/history/:destinationId?days=90
router.get("/history/:destinationId", (req, res) => {
  const days = Number(req.query.days) || 90;
  const stats = store.getHistory(req.params.destinationId, days);
  res.json(stats);
});

// GET /api/stats/kpis — overview KPI cards
router.get("/kpis", (req, res) => {
  const destinations = store.getDestinations();
  const liveSnapshot = store.getLiveSnapshot();
  const totalLiveVisitors = Object.values(liveSnapshot).reduce((a, b) => a + b, 0);

  let topDestination = null;
  let topCount = -1;
  destinations.forEach((d) => {
    const count = liveSnapshot[d._id] || 0;
    if (count > topCount) {
      topCount = count;
      topDestination = d.name;
    }
  });

  const modelSummary = getLatestModelSummary();

  res.json({
    totalDestinations: destinations.length,
    todaysBookings: store.countTodaysBookings(),
    totalLiveVisitorsToday: totalLiveVisitors,
    topDestination: topDestination || "N/A",
    topDestinationCount: topCount > 0 ? topCount : 0,
    modelName: modelSummary?.name || "No model trained",
    modelAccuracy: modelSummary?.trainingMetrics?.mae ?? null,
    modelType: modelSummary?.modelType || "not-set",
  });
});

// GET /api/stats/trending — destinations ranked by live visitor count
router.get("/trending", (req, res) => {
  const destinations = store.getDestinations();
  const liveSnapshot = store.getLiveSnapshot();

  const trending = destinations
    .map((d) => ({
      destinationId: d._id,
      name: d.name,
      liveVisitorCount: liveSnapshot[d._id] || 0,
      category: d.category,
    }))
    .sort((a, b) => b.liveVisitorCount - a.liveVisitorCount);

  res.json(trending);
});

// GET /api/stats/bookings/recent?limit=10
router.get("/bookings/recent", (req, res) => {
  const limit = Number(req.query.limit) || 10;
  res.json(store.getRecentBookings(limit));
});

module.exports = router;
