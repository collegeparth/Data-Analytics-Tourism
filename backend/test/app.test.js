const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const app = require("../src/app");
const store = require("../src/data/store");

function request(path, options = {}) {
  const { method = "GET", body } = options;

  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const requestBody = body ? JSON.stringify(body) : undefined;
      const req = http.request(
        `http://127.0.0.1:${port}${path}`,
        {
          method,
          headers: requestBody ? { "Content-Type": "application/json" } : undefined,
        },
        (response) => {
          let data = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => { data += chunk; });
          response.on("end", () => {
            server.close();
            const payload = data ? JSON.parse(data) : {};
            resolve({ status: response.statusCode, body: payload });
          });
        }
      );

      req.on("error", (error) => {
        server.close();
        reject(error);
      });

      if (requestBody) req.write(requestBody);
      req.end();
    });
  });
}

test.beforeEach(() => {
  store.seed();
});

test("reseeding removes live counts from the previous dataset", () => {
  const originalIds = Object.keys(store.getLiveSnapshot());
  store.bumpLiveCount(originalIds[0], 100);

  store.seed();

  const snapshot = store.getLiveSnapshot();
  assert.equal(Object.keys(snapshot).length, 8);
  assert.ok(Object.values(snapshot).every((count) => count < 100));
});

test("health and destination endpoints return seeded data", async () => {
  const health = await request("/api/health");
  const destinations = await request("/api/destinations");

  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");
  assert.equal(destinations.status, 200);
  assert.equal(destinations.body.length, 8);
  assert.equal(destinations.body[0].name, "Manali");
  assert.equal(destinations.body[0].datasetSeries, "T1");
});

test("forecast rejects invalid horizons instead of silently defaulting", async () => {
  const destinationId = store.getDestinations()[0]._id;
  const response = await request(`/api/forecast/${destinationId}?horizon=0`);

  assert.equal(response.status, 400);
  assert.match(response.body.message, /between 1 and 90/);
});

test("forecast returns the requested number of future points", async () => {
  const destinationId = store.getDestinations()[0]._id;
  const response = await request(`/api/forecast/${destinationId}?horizon=3`);

  assert.equal(response.status, 200);
  assert.equal(response.body.forecast.length, 3);
  assert.match(response.body.method, /exponential smoothing/);
});

test("forecast includes a trained regression model trained on the tourism dataset", async () => {
  const destinationId = store.getDestinations()[0]._id;
  const response = await request(`/api/forecast/${destinationId}?horizon=2`);

  assert.equal(response.status, 200);
  assert.ok(response.body.model);
  assert.ok(["TourismDemandRegressionModel", "TourismDemandEnsembleModel"].includes(response.body.model.name));
  assert.ok(response.body.model.trainedOn > 0);
  assert.ok(Array.isArray(response.body.model.coefficients || response.body.model.candidates));
});

test("training endpoint persists a model for a destination", async () => {
  const destinationId = store.getDestinations()[0]._id;
  const response = await request(`/api/models/train/${destinationId}`, { method: "POST", body: { modelType: "ensemble" } });

  assert.equal(response.status, 200);
  assert.equal(response.body.model.destinationId, destinationId);
  assert.ok(response.body.model.savedAt);
  assert.ok(["ensemble", "linear-regression", "seasonal-baseline"].includes(response.body.model.modelType));
});

test("tsf dataset endpoint trains a proper real-dataset model", async () => {
  const destinationId = store.getDestinations()[0]._id;
  const response = await request(`/api/models/train-tsf/${destinationId}`, { method: "POST" });

  assert.equal(response.status, 200);
  assert.equal(response.body.model.source, "tourism_monthly_dataset.tsf");
  assert.equal(response.body.model.modelType, "tsf-seasonal-regression");
  assert.ok(response.body.model.seriesName);
  assert.ok(response.body.model.trainingMetrics.mae >= 0);
});