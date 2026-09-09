const fs = require("fs");
const path = require("path");

const DATASET_PATH = path.join(__dirname, "..", "seed-data", "tourism_monthly_dataset.tsf");

function loadTourismSeries() {
  const lines = fs.readFileSync(DATASET_PATH, "utf8").split(/\r?\n/);

  return lines
    .map((line) => line.match(/^(T\d+):(\d{4}-\d{2}-\d{2}) [^:]+:(.+)$/))
    .filter(Boolean)
    .map(([, seriesName, startDate, values]) => {
      const start = new Date(`${startDate}T00:00:00Z`);
      const observations = values.split(",").map(Number);

      return {
        seriesName,
        observations: observations.map((visitorCount, index) => {
          const date = new Date(start);
          date.setUTCMonth(start.getUTCMonth() + index);
          return { date, visitorCount };
        }),
      };
    });
}

module.exports = { loadTourismSeries };