/**
 * Live Data Simulator
 * --------------------
 * We don't have real IoT sensors/booking APIs for this college project,
 * so this module simulates a real-time data feed: every few seconds it
 * creates a new booking and/or a "live visitor tick" for a random
 * destination, saves it to the in-memory store, and emits it over
 * Socket.IO so every connected dashboard updates instantly.
 */
const store = require("../data/store");

const SAMPLE_NAMES = [
  "Aarav Mehta", "Isha Kapoor", "Rohan Iyer", "Ananya Rao", "Karan Malhotra",
  "Divya Nair", "Siddharth Joshi", "Neha Reddy", "Arjun Chawla", "Meera Pillai",
];

function startLiveFeed(io) {
  const destinations = store.getDestinations();
  if (!destinations.length) {
    console.warn("No destinations found in store — seeding may have failed.");
    return;
  }

  const intervalMs = Number(process.env.LIVE_FEED_INTERVAL_MS) || 4000;

  setInterval(() => {
    try {
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      const isBookingEvent = Math.random() < 0.4;

      const bump = Math.ceil(Math.random() * 6);
      const newCount = store.bumpLiveCount(dest._id, bump);

      let bookingPayload = null;
      if (isBookingEvent) {
        const booking = store.addBooking({
          destination: dest._id,
          touristName: SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)],
          numberOfPeople: Math.ceil(Math.random() * 4),
          status: "confirmed",
        });
        bookingPayload = {
          _id: booking._id,
          touristName: booking.touristName,
          numberOfPeople: booking.numberOfPeople,
          createdAt: booking.createdAt,
        };
      }

      const payload = {
        destinationId: dest._id,
        destinationName: dest.name,
        liveVisitorCount: newCount,
        newBooking: bookingPayload,
        timestamp: new Date().toISOString(),
      };

      io.emit("live-update", payload);
    } catch (err) {
      console.error("Live feed tick error:", err.message);
    }
  }, intervalMs);

  console.log(`Live data simulator started (tick every ${intervalMs}ms)`);
}

module.exports = { startLiveFeed };
