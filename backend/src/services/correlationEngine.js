/**
 * Correlation Analysis Engine
 * ----------------------------
 * Computes the Pearson correlation coefficient (r) between weather
 * variables and daily visitor counts for a destination.
 *
 * Pearson's r formula:
 *   r = Σ((x_i - x̄)(y_i - ȳ)) / sqrt(Σ(x_i - x̄)² * Σ(y_i - ȳ)²)
 *
 * r ranges from -1 to +1:
 *   +1  → perfect positive relationship (as x rises, y rises)
 *    0  → no linear relationship
 *   -1  → perfect negative relationship (as x rises, y falls)
 *
 * This is a standard, easily-explainable statistic for a viva — no
 * external stats library needed, just the formula above.
 */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function pearsonCorrelation(xValues, yValues) {
  const n = xValues.length;
  if (n === 0 || n !== yValues.length) return 0;

  const xMean = mean(xValues);
  const yMean = mean(yValues);

  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xSumSq * ySumSq);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

// Qualitative label for an r value — useful for displaying on the dashboard
function describeCorrelation(r) {
  const abs = Math.abs(r);
  let strength;
  if (abs >= 0.7) strength = "strong";
  else if (abs >= 0.4) strength = "moderate";
  else if (abs >= 0.2) strength = "weak";
  else strength = "negligible";

  const direction = r > 0 ? "positive" : r < 0 ? "negative" : "none";
  return `${strength} ${direction}`;
}

/**
 * Joins visitor stats with weather data by date and computes correlations
 * between: temperature vs visitors, rainfall vs visitors, and average
 * visitor count broken down by weather condition (sunny/cloudy/rainy/stormy).
 */
function analyzeWeatherCorrelation(visitorStats, weatherRecords) {
  // Build a date -> weather lookup for O(1) joins
  const weatherByDate = new Map();
  weatherRecords.forEach((w) => {
    weatherByDate.set(new Date(w.date).toDateString(), w);
  });

  const temps = [];
  const rainfalls = [];
  const visitorsForWeather = [];
  const byCondition = {}; // condition -> array of visitor counts

  visitorStats.forEach((v) => {
    const weather = weatherByDate.get(new Date(v.date).toDateString());
    if (!weather) return;

    temps.push(weather.tempCelsius);
    rainfalls.push(weather.rainfallMm);
    visitorsForWeather.push(v.visitorCount);

    if (!byCondition[weather.condition]) byCondition[weather.condition] = [];
    byCondition[weather.condition].push(v.visitorCount);
  });

  const tempCorrelation = pearsonCorrelation(temps, visitorsForWeather);
  const rainfallCorrelation = pearsonCorrelation(rainfalls, visitorsForWeather);

  const conditionAverages = Object.entries(byCondition).map(([condition, counts]) => ({
    condition,
    averageVisitors: Math.round(mean(counts)),
    sampleSize: counts.length,
  }));

  return {
    temperatureVsVisitors: {
      r: Number(tempCorrelation.toFixed(3)),
      interpretation: describeCorrelation(tempCorrelation),
    },
    rainfallVsVisitors: {
      r: Number(rainfallCorrelation.toFixed(3)),
      interpretation: describeCorrelation(rainfallCorrelation),
    },
    averageVisitorsByCondition: conditionAverages.sort((a, b) => b.averageVisitors - a.averageVisitors),
    sampleSize: temps.length,
  };
}

module.exports = { pearsonCorrelation, describeCorrelation, analyzeWeatherCorrelation };
