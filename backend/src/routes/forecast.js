const express = require("express");
const router = express.Router();
const store = require("../data/store");
const { generateForecast } = require("../services/forecastEngine");

// GET /api/forecast/:destinationId?horizon=7
router.get("/:destinationId", (req, res) => {
  try {
    const horizon = req.query.horizon === undefined ? 7 : Number(req.query.horizon);
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 90) {
      return res.status(400).json({ message: "Horizon must be a whole number between 1 and 90 days." });
    }
    const history = store.getAllHistory(req.params.destinationId);

    if (!history.length) {
      return res.status(404).json({ message: "No historical data found for this destination." });
    }

    const result = generateForecast(history, horizon);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
