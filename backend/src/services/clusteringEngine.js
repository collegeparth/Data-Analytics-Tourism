/**
 * K-Means Clustering Engine
 * --------------------------
 * Groups destinations into K clusters based on their visitor-demand
 * pattern, using a plain hand-rolled K-Means implementation (no
 * external ML library — easy to explain in a viva).
 *
 * Each destination is represented as a feature vector:
 *   [averageVisitors, weekendUpliftRatio, volatility, seasonalitySwing]
 *
 *   - averageVisitors:    mean daily visitor count (overall demand level)
 *   - weekendUpliftRatio: (avg weekend visitors) / (avg weekday visitors)
 *   - volatility:         standard deviation of daily visitor counts
 *                          (how unpredictable day-to-day demand is)
 *   - seasonalitySwing:   (max monthly avg - min monthly avg) / overall avg
 *                          (how much demand swings across the year)
 *
 * Algorithm (standard Lloyd's K-Means):
 *   1. Normalize each feature (min-max scaling) so no single feature
 *      dominates just because its numbers are bigger.
 *   2. Pick K initial centroids (evenly spaced across the data).
 *   3. Repeat until centroids stop moving (or max iterations hit):
 *      a. Assign each destination to its nearest centroid (Euclidean distance).
 *      b. Recompute each centroid as the mean of its assigned points.
 */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  const variance = mean(arr.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

// Builds the 4-dimensional feature vector described above for one destination
function buildFeatureVector(visitorStats) {
  const counts = visitorStats.map((v) => v.visitorCount);
  const overallAvg = mean(counts);

  const weekendCounts = visitorStats.filter((v) => v.isWeekend).map((v) => v.visitorCount);
  const weekdayCounts = visitorStats.filter((v) => !v.isWeekend).map((v) => v.visitorCount);
  const weekendUpliftRatio =
    weekdayCounts.length && weekendCounts.length ? mean(weekendCounts) / mean(weekdayCounts) : 1;

  const volatility = stdDev(counts);

  // Group by month to measure seasonal swing
  const monthlyTotals = {};
  const monthlyCounts = {};
  visitorStats.forEach((v) => {
    const month = new Date(v.date).getMonth();
    monthlyTotals[month] = (monthlyTotals[month] || 0) + v.visitorCount;
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });
  const monthlyAverages = Object.keys(monthlyTotals).map((m) => monthlyTotals[m] / monthlyCounts[m]);
  const seasonalitySwing = monthlyAverages.length
    ? (Math.max(...monthlyAverages) - Math.min(...monthlyAverages)) / overallAvg
    : 0;

  return {
    averageVisitors: overallAvg,
    weekendUpliftRatio,
    volatility,
    seasonalitySwing,
  };
}

function normalizeFeatures(featureObjects) {
  const keys = ["averageVisitors", "weekendUpliftRatio", "volatility", "seasonalitySwing"];
  const mins = {};
  const maxs = {};

  keys.forEach((key) => {
    const values = featureObjects.map((f) => f[key]);
    mins[key] = Math.min(...values);
    maxs[key] = Math.max(...values);
  });

  return featureObjects.map((f) => {
    const normalized = {};
    keys.forEach((key) => {
      const range = maxs[key] - mins[key];
      normalized[key] = range === 0 ? 0 : (f[key] - mins[key]) / range;
    });
    return normalized;
  });
}

function euclideanDistance(a, b, keys) {
  return Math.sqrt(keys.reduce((sum, key) => sum + (a[key] - b[key]) ** 2, 0));
}

function kMeans(normalizedPoints, k, maxIterations = 50) {
  const keys = Object.keys(normalizedPoints[0]);

  // Initialize centroids evenly spaced through the (sorted-by-avg) data
  // rather than fully random, so results are stable/reproducible for a demo.
  const sortedIndices = normalizedPoints
    .map((_, i) => i)
    .sort((a, b) => normalizedPoints[a].averageVisitors - normalizedPoints[b].averageVisitors);

  let centroids = [];
  for (let c = 0; c < k; c++) {
    const idx = sortedIndices[Math.floor((c * (sortedIndices.length - 1)) / Math.max(k - 1, 1))];
    centroids.push({ ...normalizedPoints[idx] });
  }

  let assignments = new Array(normalizedPoints.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assignment step
    const newAssignments = normalizedPoints.map((point) => {
      let bestCluster = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, cIdx) => {
        const dist = euclideanDistance(point, centroid, keys);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestCluster = cIdx;
        }
      });
      return bestCluster;
    });

    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed && iter > 0) break; // converged

    // Update step
    centroids = centroids.map((_, cIdx) => {
      const clusterPoints = normalizedPoints.filter((_, i) => assignments[i] === cIdx);
      if (!clusterPoints.length) return centroids[cIdx]; // keep old centroid if cluster is empty
      const newCentroid = {};
      keys.forEach((key) => {
        newCentroid[key] = mean(clusterPoints.map((p) => p[key]));
      });
      return newCentroid;
    });
  }

  return assignments;
}

/**
 * Main entry point: clusters an array of {destinationId, name, visitorStats}
 * into k groups and returns human-readable labels (Low/Medium/High demand
 * etc.) based on each cluster's average visitor level.
 */
function clusterDestinations(destinationsWithHistory, k = 3) {
  const valid = destinationsWithHistory.filter((d) => d.visitorStats.length >= 14);
  if (valid.length < k) {
    throw new Error(`Need at least ${k} destinations with sufficient history to form ${k} clusters.`);
  }

  const rawFeatures = valid.map((d) => buildFeatureVector(d.visitorStats));
  const normalized = normalizeFeatures(rawFeatures);
  const assignments = kMeans(normalized, k);

  // Label clusters by their average demand level (Low/Medium/High/...)
  const clusterAvgDemand = {};
  assignments.forEach((clusterIdx, i) => {
    if (!clusterAvgDemand[clusterIdx]) clusterAvgDemand[clusterIdx] = [];
    clusterAvgDemand[clusterIdx].push(rawFeatures[i].averageVisitors);
  });
  const clusterOrder = Object.keys(clusterAvgDemand)
    .map(Number)
    .sort((a, b) => mean(clusterAvgDemand[a]) - mean(clusterAvgDemand[b]));

  const demandLabels = ["Low Demand", "Medium Demand", "High Demand", "Very High Demand", "Extreme Demand"];
  const labelByClusterIdx = {};
  clusterOrder.forEach((clusterIdx, rank) => {
    labelByClusterIdx[clusterIdx] = demandLabels[rank] || `Cluster ${rank + 1}`;
  });

  const results = valid.map((d, i) => ({
    destinationId: d.destinationId,
    name: d.name,
    clusterId: assignments[i],
    clusterLabel: labelByClusterIdx[assignments[i]],
    features: {
      averageVisitors: Math.round(rawFeatures[i].averageVisitors),
      weekendUpliftRatio: Number(rawFeatures[i].weekendUpliftRatio.toFixed(2)),
      volatility: Math.round(rawFeatures[i].volatility),
      seasonalitySwing: Number(rawFeatures[i].seasonalitySwing.toFixed(2)),
    },
  }));

  return { k, destinations: results };
}

module.exports = { clusterDestinations, buildFeatureVector, kMeans };
