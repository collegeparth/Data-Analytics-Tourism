const store = require("../data/store");

// Handles new client connections. When a dashboard connects, we
// immediately send it the current live snapshot so it doesn't have to
// wait for the next tick to show data.
function initSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.emit("live-snapshot", store.getLiveSnapshot());

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = initSocket;
