function solveLinearSystem(matrix, vector) {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let pivotIndex = 0; pivotIndex < n; pivotIndex += 1) {
    let pivotRow = pivotIndex;

    for (let row = pivotIndex + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivotIndex]) > Math.abs(augmented[pivotRow][pivotIndex])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][pivotIndex]) < 1e-10) {
      continue;
    }

    if (pivotRow !== pivotIndex) {
      [augmented[pivotIndex], augmented[pivotRow]] = [augmented[pivotRow], augmented[pivotIndex]];
    }

    const pivotValue = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= n; column += 1) {
      augmented[pivotIndex][column] /= pivotValue;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === pivotIndex) continue;
      const factor = augmented[row][pivotIndex];
      if (Math.abs(factor) < 1e-10) continue;
      for (let column = pivotIndex; column <= n; column += 1) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function buildFeatureMatrix(records) {
  return records.map((record, index) => {
    const date = new Date(record.date);
    const month = date.getUTCMonth();
    const monthAngle = (month / 12) * 2 * Math.PI;

    return [
      1,
      index,
      Math.sin(monthAngle),
      Math.cos(monthAngle),
    ];
  });
}

function calculateMeanAbsoluteError(actual, predicted) {
  if (!actual.length) return 0;
  const totalError = actual.reduce((sum, value, index) => sum + Math.abs(value - predicted[index]), 0);
  return totalError / actual.length;
}

function calculateMeanSquaredError(actual, predicted) {
  if (!actual.length) return 0;
  const totalError = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  return totalError / actual.length;
}

function computeSeasonalProfile(records) {
  const levels = Array(7).fill(0);
  const counts = Array(7).fill(0);

  records.forEach((record) => {
    const day = new Date(record.date).getDay();
    levels[day] += record.visitorCount;
    counts[day] += 1;
  });

  const overallAverage = records.reduce((sum, record) => sum + record.visitorCount, 0) / Math.max(records.length, 1);
  return levels.map((sum, day) => {
    const avg = counts[day] ? sum / counts[day] : overallAverage;
    return Number((avg / overallAverage || 1).toFixed(6));
  });
}

function trainSeasonalBaselineModel(records) {
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const seasonalProfile = computeSeasonalProfile(sorted);
  const average = sorted.reduce((sum, record) => sum + record.visitorCount, 0) / sorted.length;
  const mae = calculateMeanAbsoluteError(
    sorted.map((record) => record.visitorCount),
    sorted.map((record) => {
      const weekday = new Date(record.date).getDay();
      return Math.max(average * seasonalProfile[weekday], 0);
    })
  );

  return {
    name: "TourismDemandSeasonalBaselineModel",
    modelType: "seasonal-baseline",
    source: "tourism_monthly_dataset.tsf",
    trainedOn: sorted.length,
    trainedAt: new Date().toISOString(),
    coefficients: seasonalProfile,
    featureNames: ["weekday_multipliers"],
    trainingMetrics: {
      mae: Number(mae.toFixed(2)),
      mse: Number(calculateMeanSquaredError(
        sorted.map((record) => record.visitorCount),
        sorted.map((record) => {
          const weekday = new Date(record.date).getDay();
          return Math.max(average * seasonalProfile[weekday], 0);
        })
      ).toFixed(2)),
    },
  };
}

function trainLinearRegressionModel(records) {
  if (!records || records.length < 12) {
    throw new Error("A tourism demand model requires at least 12 monthly records.");
  }

  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const featureMatrix = buildFeatureMatrix(sorted);
  const targets = sorted.map((record) => Number(record.visitorCount));

  const featureCount = featureMatrix[0].length;
  const xtx = Array.from({ length: featureCount }, () => Array(featureCount).fill(0));
  const xty = Array(featureCount).fill(0);

  featureMatrix.forEach((features, rowIndex) => {
    features.forEach((featureValue, featureIndex) => {
      xty[featureIndex] += featureValue * targets[rowIndex];
      for (let j = 0; j < featureCount; j += 1) {
        xtx[featureIndex][j] += featureValue * featureMatrix[rowIndex][j];
      }
    });
  });

  const coefficients = solveLinearSystem(xtx, xty);
  const predictions = featureMatrix.map((features) => {
    return features.reduce((sum, value, index) => sum + value * coefficients[index], 0);
  });

  const mae = calculateMeanAbsoluteError(targets, predictions);
  const mse = calculateMeanSquaredError(targets, predictions);

  return {
    name: "TourismDemandRegressionModel",
    modelType: "linear-regression",
    source: "tourism_monthly_dataset.tsf",
    trainedOn: sorted.length,
    trainedAt: new Date().toISOString(),
    coefficients: coefficients.map((value) => Number(value.toFixed(6))),
    featureNames: ["intercept", "timeIndex", "seasonalitySin", "seasonalityCos"],
    trainingMetrics: {
      mae: Number(mae.toFixed(2)),
      mse: Number(mse.toFixed(2)),
    },
  };
}

function trainEnsembleModel(records) {
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const candidates = [
    trainSeasonalBaselineModel(sorted),
    trainLinearRegressionModel(sorted),
  ];

  const inverseScores = candidates.map((candidate) => 1 / Math.max(candidate.trainingMetrics.mae, 1));
  const totalWeight = inverseScores.reduce((sum, item) => sum + item, 0) || 1;
  const weights = inverseScores.map((item) => item / totalWeight);

  const mergedPredictions = sorted.map((record, index) => {
    const weekday = new Date(record.date).getDay();
    const seasonalPrediction = (sorted.reduce((sum, item) => sum + item.visitorCount, 0) / sorted.length) * computeSeasonalProfile(sorted)[weekday];
    const regressionFeatures = buildFeatureMatrix(sorted)[index];
    const regressionPrediction = regressionFeatures.reduce((sum, value, featureIndex) => sum + value * trainLinearRegressionModel(sorted).coefficients[featureIndex], 0);

    return (weights[0] * seasonalPrediction) + (weights[1] * regressionPrediction);
  });

  const mae = calculateMeanAbsoluteError(
    sorted.map((record) => record.visitorCount),
    mergedPredictions
  );
  const mse = calculateMeanSquaredError(
    sorted.map((record) => record.visitorCount),
    mergedPredictions
  );

  return {
    name: "TourismDemandEnsembleModel",
    modelType: "ensemble",
    source: "tourism_monthly_dataset.tsf",
    trainedOn: sorted.length,
    trainedAt: new Date().toISOString(),
    coefficients: weights.map((weight) => Number(weight.toFixed(6))),
    candidates: candidates.map((candidate) => ({
      name: candidate.name,
      modelType: candidate.modelType,
      mae: candidate.trainingMetrics.mae,
      mse: candidate.trainingMetrics.mse,
    })),
    featureNames: ["seasonal_weight", "regression_weight"],
    trainingMetrics: {
      mae: Number(mae.toFixed(2)),
      mse: Number(mse.toFixed(2)),
    },
  };
}

function trainTSFSeasonalRegressionModel(series) {
  if (!series || !series.observations || series.observations.length < 12) {
    throw new Error("The TSF tourism dataset needs at least 12 monthly observations to train a model.");
  }

  const sorted = [...series.observations].sort((a, b) => new Date(a.date) - new Date(b.date));
  const targets = sorted.map((record) => Number(record.visitorCount));
  const features = sorted.map((record, index) => {
    const date = new Date(record.date);
    const month = date.getUTCMonth();
    const monthAngle = (month / 12) * 2 * Math.PI;
    return [1, index, Math.sin(monthAngle), Math.cos(monthAngle)];
  });

  const featureCount = features[0].length;
  const xtx = Array.from({ length: featureCount }, () => Array(featureCount).fill(0));
  const xty = Array(featureCount).fill(0);

  features.forEach((row, rowIndex) => {
    row.forEach((featureValue, featureIndex) => {
      xty[featureIndex] += featureValue * targets[rowIndex];
      for (let j = 0; j < featureCount; j += 1) {
        xtx[featureIndex][j] += featureValue * row[j];
      }
    });
  });

  const coefficients = solveLinearSystem(xtx, xty);
  const predictions = features.map((row) => row.reduce((sum, value, index) => sum + value * coefficients[index], 0));
  const mae = calculateMeanAbsoluteError(targets, predictions);
  const mse = calculateMeanSquaredError(targets, predictions);

  return {
    name: "TSFDemandSeasonalRegressionModel",
    modelType: "tsf-seasonal-regression",
    source: "tourism_monthly_dataset.tsf",
    seriesName: series.seriesName,
    trainedOn: sorted.length,
    trainedAt: new Date().toISOString(),
    coefficients: coefficients.map((value) => Number(value.toFixed(6))),
    featureNames: ["intercept", "timeIndex", "seasonalitySin", "seasonalityCos"],
    trainingMetrics: {
      mae: Number(mae.toFixed(2)),
      mse: Number(mse.toFixed(2)),
    },
  };
}

function trainTourismDemandModel(records, modelType = "ensemble") {
  if (!records || records.length < 12) {
    throw new Error("A tourism demand model requires at least 12 monthly records.");
  }

  const normalizedType = (modelType || "ensemble").toLowerCase();

  if (normalizedType === "seasonal-baseline") {
    return trainSeasonalBaselineModel(records);
  }

  if (normalizedType === "linear-regression") {
    return trainLinearRegressionModel(records);
  }

  return trainEnsembleModel(records);
}

module.exports = {
  trainTourismDemandModel,
  trainTSFSeasonalRegressionModel,
  trainSeasonalBaselineModel,
  trainLinearRegressionModel,
  trainEnsembleModel,
  buildFeatureMatrix,
  solveLinearSystem,
};
