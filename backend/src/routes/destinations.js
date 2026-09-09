const express = require("express");
const router = express.Router();
const store = require("../data/store");

// GET /api/destinations — list all destinations (used for map + filters)
router.get("/", (req, res) => {
  res.json(store.getDestinations());
});

// GET /api/destinations/:id — single destination detail
router.get("/:id", (req, res) => {
  const destination = store.getDestinationById(req.params.id);
  if (!destination) return res.status(404).json({ message: "Destination not found" });
  res.json(destination);
});

module.exports = router;
