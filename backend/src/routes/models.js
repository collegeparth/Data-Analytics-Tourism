const express = require("express");
const router = express.Router();
const { buildModelRecord, buildTSFModelRecord, getSavedModels } = require("../services/modelRegistry");

router.post("/train/:destinationId", (req, res) => {
  try {
    const { modelType = "ensemble" } = req.body || {};
    const validTypes = ["ensemble", "linear-regression", "seasonal-baseline"];

    if (!validTypes.includes(String(modelType).toLowerCase())) {
      return res.status(400).json({ message: "Unsupported model type. Use ensemble, linear-regression, or seasonal-baseline." });
    }

    const model = buildModelRecord(req.params.destinationId, String(modelType).toLowerCase());
    res.json({ message: "Model trained and saved successfully.", model });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/train-tsf/:destinationId", (req, res) => {
  try {
    const { seriesName } = req.body || {};
    const model = buildTSFModelRecord(req.params.destinationId, seriesName);
    res.json({ message: "TSF model trained and saved successfully.", model });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/saved", (req, res) => {
  res.json(getSavedModels());
});

module.exports = router;
