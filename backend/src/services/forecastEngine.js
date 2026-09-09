/**
 * Forecast Engine
 * ----------------
 * A lightweight, explainable forecasting method — no external ML library needed.
 * Combines two ideas that are easy to explain in a viva:
 *
 * 1. LINEAR TREND: fit a simple linear regression (y = m*x + c) on the
 *    historical visitor counts (x = day index, y = visitor count) to
 *    capture whether demand is generally rising or falling over time.
 *
 * 2. SEASONAL INDEX: compute an average multiplier for each day-of-week
 *    (e.g., Saturdays are typically 25% busier than the daily average).
 *    This captures weekly seasonality that a pure trend line would miss.
 *
 * Final forecast for a future day = (trend line value at that day) * (seasonal index for that weekday)
 *
 * We also compute MAE and RMSE on a held-out test split (last 20% of
 * historical data) so the accuracy can be reported and explained.
 */

const { trainTourismDemandModel } = require("./tourismModel");

// --- Linear regression: returns {slope, intercept} ---
function linearRegression(xValues, yValues) {
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// --- Seasonal index per weekday (0=Sunday ... 6=Saturday) ---
function computeSeasonalIndex(records) {
  const overallAvg = records.reduce((a, r) => a + r.visitorCount, 0) / records.length;

  const weekdayTotals = Array(7).fill(0);
  const weekdayCounts = Array(7).fill(0);

  records.forEach((r) => {
    const day = new Date(r.date).getDay();
    weekdayTotals[day] += r.visitorCount;
    weekdayCounts[day] += 1;
  });

  const index = weekdayTotals.map((total, i) =>
    weekdayCounts[i] === 0 ? 1 : total / weekdayCounts[i] / overallAvg
  );

  return index; // array of 7 multipliers
}

// Holt's double exponential smoothing tracks both the current level and trend.
function exponentialSmoothing(values, alpha = 0.3, beta = 0.1) {
  if (!values.length) return { level: 0, trend: 0 };

  let level = values[0];
  let trend = values.length > 1 ? values[1] - values[0] : 0;

  for (let i = 1; i < values.length; i++) {
    const previousLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }

  return { level, trend };
}

function smoothedForecast(smoothing, steps) {
  return Math.max(smoothing.level + smoothing.trend * steps, 0);
}

// --- Core forecast function ---
// records: array of {date, visitorCount} sorted ascending by date
// horizonDays: how many future days to predict
function generateForecast(records, horizonDays = 7) {
  if (!records || records.length < 14) {
    throw new Error("Not enough historical data to forecast (need at least 14 days).");
  }

  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Split: 80% train, 20% test (for accuracy evaluation)
  const splitIndex = Math.floor(sorted.length * 0.8);
  const trainSet = sorted.slice(0, splitIndex);
  const testSet = sorted.slice(splitIndex);

  const xTrain = trainSet.map((_, i) => i);
  const yTrain = trainSet.map((r) => r.visitorCount);
  const { slope, intercept } = linearRegression(xTrain, yTrain);
  const trainSmoothing = exponentialSmoothing(yTrain);
  const seasonalIndex = computeSeasonalIndex(trainSet);

  // Predict function for a given index position (continuing from trainSet)
  function predictAtIndex(index, date) {
    const regressionValue = slope * index + intercept;
    const smoothingValue = smoothedForecast(trainSmoothing, index - splitIndex + 1);
    const trendValue = (regressionValue + smoothingValue) / 2;
    const weekday = new Date(date).getDay();
    return Math.max(Math.round(trendValue * seasonalIndex[weekday]), 0);
  }

  // --- Evaluate on test set ---
  let absErrorSum = 0;
  let squaredErrorSum = 0;
  testSet.forEach((r, i) => {
    const predicted = predictAtIndex(splitIndex + i, r.date);
    const error = predicted - r.visitorCount;
    absErrorSum += Math.abs(error);
    squaredErrorSum += error * error;
  });
  const mae = testSet.length ? absErrorSum / testSet.length : null;
  const rmse = testSet.length ? Math.sqrt(squaredErrorSum / testSet.length) : null;

  // --- Refit on FULL dataset for actual future forecasting ---
  const xFull = sorted.map((_, i) => i);
  const yFull = sorted.map((r) => r.visitorCount);
  const fullFit = linearRegression(xFull, yFull);
  const fullSmoothing = exponentialSmoothing(yFull);
  const fullSeasonalIndex = computeSeasonalIndex(sorted);

  const lastDate = new Date(sorted[sorted.length - 1].date);
  const forecast = [];

  for (let d = 1; d <= horizonDays; d++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + d);

    const futureIndex = sorted.length - 1 + d;
    const regressionValue = fullFit.slope * futureIndex + fullFit.intercept;
    const smoothingValue = smoothedForecast(fullSmoothing, d);
    const trendValue = (regressionValue + smoothingValue) / 2;
    const weekday = futureDate.getDay();
    const predictedValue = Math.max(
      Math.round(trendValue * fullSeasonalIndex[weekday]),
      0
    );

    // simple +-10% confidence band for visual range on the chart
    forecast.push({
      date: futureDate.toISOString().split("T")[0],
      predicted: predictedValue,
      lowerBound: Math.round(predictedValue * 0.9),
      upperBound: Math.round(predictedValue * 1.1),
    });
  }

  const model = trainTourismDemandModel(sorted);

  return {
    forecast,
    accuracy: { mae: mae ? Number(mae.toFixed(2)) : null, rmse: rmse ? Number(rmse.toFixed(2)) : null },
    method: "Linear trend regression + Holt exponential smoothing + weekly seasonal index",
    trainSize: trainSet.length,
    testSize: testSet.length,
    model,
  };
}

module.exports = { generateForecast, linearRegression, computeSeasonalIndex, exponentialSmoothing };
