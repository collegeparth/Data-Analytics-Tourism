import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

/**
 * Connects to the backend Socket.IO server once, keeps a running
 * dictionary of live visitor counts per destination, and a rolling
 * list of the most recent live events (for a "live feed" ticker).
 */
export default function useSocket() {
  const socketRef = useRef(null);
  const [liveCounts, setLiveCounts] = useState({}); // destinationId -> count
  const [recentEvents, setRecentEvents] = useState([]); // last N live-update payloads
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("live-snapshot", (snapshot) => {
      setLiveCounts(snapshot);
    });

    socket.on("live-update", (payload) => {
      setLiveCounts((prev) => ({
        ...prev,
        [payload.destinationId]: payload.liveVisitorCount,
      }));
      setRecentEvents((prev) => [payload, ...prev].slice(0, 15));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { liveCounts, recentEvents, connected };
}
