/**
 * In-Memory Data Store
 * ---------------------
 * Replaces MongoDB for this project so there is ZERO external database
 * setup required — no MongoDB install, no Atlas account, nothing.
 * All data lives in plain JS arrays in the server's memory and is
 * regenerated fresh (~2 years of realistic dummy history) every time
 * the server starts.
 *
 * Trade-off: data resets whenever the server restarts. That's fine for
 * a PBL/demo project — if you later want persistence, this is the only
 * file you'd need to swap out for a real database layer.
 */
const crypto = require("crypto");
const { loadTourismSeries } = require("./tourismDataset");

function generateId() {
  return crypto.randomUUID();
}

// ---------- In-memory collections ----------
let destinations = [];
let visitorStats = []; // {_id, destination, date, visitorCount, isWeekend, isHoliday}
let weatherData = [];
let events = [];
let bookings = [];

const liveVisitorCounts = {}; // destinationId -> running "today" count

// ---------- Seed configuration (same logic as the old seed script) ----------
const DESTINATION_SEEDS = [
  { name: "Manali", state: "Himachal Pradesh", category: "hill-station", latitude: 32.2432, longitude: 77.1892, basePopularity: 78 },
  { name: "Panaji", state: "Goa", category: "beach", latitude: 15.2993, longitude: 74.124, basePopularity: 90 },
  { name: "Jaipur", state: "Rajasthan", category: "heritage", latitude: 26.9124, longitude: 75.7873, basePopularity: 82 },
  { name: "Sawai Madhopur", state: "Rajasthan", category: "wildlife", latitude: 26.0173, longitude: 76.5026, basePopularity: 60 },
  { name: "Varanasi", state: "Uttar Pradesh", category: "religious", latitude: 25.3176, longitude: 82.9739, basePopularity: 70 },
  { name: "Mumbai", state: "Maharashtra", category: "urban", latitude: 19.076, longitude: 72.8777, basePopularity: 85 },
  { name: "Munnar", state: "Kerala", category: "hill-station", latitude: 10.0889, longitude: 77.0595, basePopularity: 68 },
  { name: "Rishikesh", state: "Uttarakhand", category: "religious", latitude: 30.0869, longitude: 78.2676, basePopularity: 65 },
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function seasonalFactor(date, category) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const peakDay = category === "hill-station" ? 170 : category === "beach" ? 355 : 100;
  const distance = Math.min(Math.abs(dayOfYear - peakDay), 365 - Math.abs(dayOfYear - peakDay));
  return 1 + 0.5 * Math.cos((distance / 365) * 2 * Math.PI);
}

function randomWeather() {
  const conditions = ["sunny", "cloudy", "rainy", "stormy"];
  const weights = [0.5, 0.25, 0.2, 0.05];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < conditions.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return conditions[i];
  }
  return "sunny";
}

// ---------- Seeding ----------
function seed() {
  destinations = [];
  visitorStats = [];
  weatherData = [];
  events = [];
  bookings = [];
  Object.keys(liveVisitorCounts).forEach((destinationId) => {
    delete liveVisitorCounts[destinationId];
  });

  const tourismSeries = loadTourismSeries();
  if (tourismSeries.length < DESTINATION_SEEDS.length) {
    throw new Error("Tourism dataset does not contain enough series for the configured destinations.");
  }

  destinations = DESTINATION_SEEDS.map((d, index) => ({
    _id: generateId(),
    ...d,
    datasetSeries: tourismSeries[index].seriesName,
  }));

  events = destinations.map((dest) => {
    const start = new Date();
    start.setMonth(5, 15);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    return {
      _id: generateId(),
      destination: dest._id,
      name: `${dest.name} Cultural Festival`,
      startDate: start,
      endDate: end,
      demandBoostFactor: 1.4,
    };
  });

  destinations.forEach((dest, destinationIndex) => {
    const eventForDest = events.find((e) => e.destination === dest._id);
    const series = tourismSeries[destinationIndex];

    series.observations.forEach(({ date, visitorCount }) => {
      const weekend = isWeekend(date);
      const inEventWindow = eventForDest && date >= eventForDest.startDate && date <= eventForDest.endDate;
      const condition = randomWeather();

      visitorStats.push({
        _id: generateId(),
        destination: dest._id,
        date,
        visitorCount: Math.max(Math.round(visitorCount), 0),
        isWeekend: weekend,
        isHoliday: !!inEventWindow,
      });

      weatherData.push({
        _id: generateId(),
        destination: dest._id,
        date,
        tempCelsius: Math.round(randomBetween(12, 38)),
        condition,
        rainfallMm: 0,
      });
    });

    liveVisitorCounts[dest._id] = Math.floor(Math.random() * 50);
  });

  const sampleNames = ["Rahul Sharma", "Priya Verma", "Aman Gupta", "Sneha Kulkarni", "Vikram Singh"];
  bookings = destinations.slice(0, 5).map((dest, i) => ({
    _id: generateId(),
    destination: dest._id,
    touristName: sampleNames[i],
    numberOfPeople: Math.ceil(randomBetween(1, 5)),
    status: "confirmed",
    createdAt: new Date(),
  }));

  console.log(`In-memory store seeded: ${destinations.length} destinations, ${visitorStats.length} visitor-stat days, ${bookings.length} initial bookings`);
}

// ---------- Query helpers (mirrors the old Mongoose queries) ----------
function getDestinations() {
  return destinations;
}

function getDestinationById(id) {
  return destinations.find((d) => d._id === id) || null;
}

function getHistory(destinationId, days) {
  const stats = visitorStats
    .filter((v) => v.destination === destinationId)
    .sort((a, b) => a.date - b.date);
  return days ? stats.slice(-days) : stats;
}

function getAllHistory(destinationId) {
  return visitorStats
    .filter((v) => v.destination === destinationId)
    .sort((a, b) => a.date - b.date);
}

function getWeatherHistory(destinationId) {
  return weatherData
    .filter((w) => w.destination === destinationId)
    .sort((a, b) => a.date - b.date);
}

function addBooking({ destination, touristName, numberOfPeople, status }) {
  const booking = {
    _id: generateId(),
    destination,
    touristName,
    numberOfPeople,
    status: status || "confirmed",
    createdAt: new Date(),
  };
  bookings.push(booking);
  return booking;
}

function getRecentBookings(limit = 10) {
  return [...bookings]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((b) => ({
      ...b,
      destination: getDestinationById(b.destination)
        ? { _id: b.destination, name: getDestinationById(b.destination).name }
        : null,
    }));
}

function countTodaysBookings() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return bookings.filter((b) => b.createdAt >= startOfToday).length;
}

function getLiveSnapshot() {
  return liveVisitorCounts;
}

function bumpLiveCount(destinationId, amount) {
  liveVisitorCounts[destinationId] = (liveVisitorCounts[destinationId] || 0) + amount;
  return liveVisitorCounts[destinationId];
}

module.exports = {
  seed,
  getDestinations,
  getDestinationById,
  getHistory,
  getAllHistory,
  getWeatherHistory,
  addBooking,
  getRecentBookings,
  countTodaysBookings,
  getLiveSnapshot,
  bumpLiveCount,
};
