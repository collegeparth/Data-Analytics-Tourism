const { trainTourismDemandModel, trainTSFSeasonalRegressionModel } = require("./tourismModel");
const { loadTourismSeries } = require("../data/tourismDataset");
const store = require("../data/store");

const modelRegistry = new Map();

function getModelKey(destinationId, modelType) {
  return `${destinationId}:${modelType}`;
}

function buildModelRecord(destinationId, modelType = "ensemble") {
  const destination = store.getDestinationById(destinationId);
  if (!destination) {
    throw new Error("Destination not found");
  }

  const history = store.getAllHistory(destinationId);
  if (!history.length) {
    throw new Error("No historical data found for this destination.");
  }

  const model = trainTourismDemandModel(history, modelType);
  const record = {
    destinationId,
    destinationName: destination.name,
    modelType: model.modelType,
    modelName: model.name,
    trainedOn: model.trainedOn,
    savedAt: new Date().toISOString(),
    trainingMetrics: model.trainingMetrics,
    coefficients: model.coefficients,
    candidates: model.candidates || [],
  };

  modelRegistry.set(getModelKey(destinationId, model.modelType), record);
  return record;
}

function buildTSFModelRecord(destinationId, seriesName) {
  const destination = store.getDestinationById(destinationId);
  if (!destination) {
    throw new Error("Destination not found");
  }

  const series = loadTourismSeries().find((entry) =>
    entry.seriesName === (seriesName || destination.datasetSeries)
  );

  if (!series) {
    throw new Error("Could not find a matching series in the TSF dataset for this destination.");
  }

  const model = trainTSFSeasonalRegressionModel(series);
  const record = {
    destinationId,
    destinationName: destination.name,
    seriesName: model.seriesName,
    modelType: model.modelType,
    modelName: model.name,
    source: model.source,
    trainedOn: model.trainedOn,
    savedAt: new Date().toISOString(),
    trainingMetrics: model.trainingMetrics,
    coefficients: model.coefficients,
    featureNames: model.featureNames,
  };

  modelRegistry.set(getModelKey(destinationId, model.modelType), record);
  return record;
}

function initializeDefaultModels(modelType = "ensemble") {
  modelRegistry.clear();

  const destinations = store.getDestinations();
  const savedModels = destinations.map((destination) => buildModelRecord(destination._id, modelType));

  return savedModels;
}

function getLatestModelSummary() {
  const entries = [...modelRegistry.values()];
  if (!entries.length) return null;

  return entries
    .slice()
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))[0];
}

function getSavedModels() {
  return [...modelRegistry.values()];
}

module.exports = {
  buildModelRecord,
  buildTSFModelRecord,
  initializeDefaultModels,
  getLatestModelSummary,
  getSavedModels,
  modelRegistry,
};
