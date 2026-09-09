require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const store = require("./src/data/store");
const initSocket = require("./src/sockets/socketHandler");
const { startLiveFeed } = require("./src/services/liveDataSimulator");
const { initializeDefaultModels } = require("./src/services/modelRegistry");

const PORT = process.env.PORT || 5000;

function start() {
  // No database setup needed — generates ~2 years of realistic dummy
  // data straight into memory every time the server starts.
  console.log("Seeding in-memory data store...");
  store.seed();

  console.log("Training default saved models for all destinations...");
  const models = initializeDefaultModels("ensemble");
  console.log(`Saved ${models.length} trained ensemble models for the destination dataset.`);

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "*" },
  });

  initSocket(io);

  server.listen(PORT, () => {
    startLiveFeed(io);
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Unable to start: port ${PORT} is already in use. Stop the existing backend or set PORT to another value.`);
    } else {
      console.error("Unable to start backend:", error.message);
    }
    process.exitCode = 1;
  });
}

start();
