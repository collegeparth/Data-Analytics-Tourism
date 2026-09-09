import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import useSocket from "../hooks/useSocket";
import { getDestinations, getKpis, getTrending, getHistory } from "../services/api";
import KpiCards from "../components/KpiCards";
import LiveVisitorChart from "../components/LiveVisitorChart";
import DestinationBarChart from "../components/DestinationBarChart";
import TourismMap from "../components/TourismMap";
import FilterBar from "../components/FilterBar";
import LiveFeedTicker from "../components/LiveFeedTicker";

export default function Dashboard() {
  const { liveCounts, recentEvents, connected } = useSocket();

  const [destinations, setDestinations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [days, setDays] = useState(90);
  const [kpis, setKpis] = useState(null);
  const [trending, setTrending] = useState([]);
  const [history, setHistory] = useState([]);

  // Initial load
  useEffect(() => {
    (async () => {
      const dests = await getDestinations();
      setDestinations(dests);
      if (dests.length) setSelectedId(dests[0]._id);
    })();
  }, []);

  // Poll KPIs + trending every few seconds (these are derived from live snapshot server-side)
  const refreshOverview = useCallback(async () => {
    const [kpiData, trendingData] = await Promise.all([getKpis(), getTrending()]);
    setKpis(kpiData);
    setTrending(trendingData);
  }, []);

  useEffect(() => {
    refreshOverview();
    const interval = setInterval(refreshOverview, 5000);
    return () => clearInterval(interval);
  }, [refreshOverview, liveCounts]);

  // Reload history whenever selected destination or range changes
  useEffect(() => {
    if (!selectedId) return;
    getHistory(selectedId, days).then(setHistory);
  }, [selectedId, days]);

  const liveTotal = Object.values(liveCounts).reduce((a, b) => a + b, 0);
  const selectedDestination = destinations.find((d) => d._id === selectedId);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tourism Analytics Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time visitor & booking overview across destinations</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/analytics"
            className="border border-primary text-primary text-sm px-4 py-2 rounded-md font-medium"
          >
            Data Analytics
          </Link>
          <Link
            to={`/forecast/${selectedId || ""}`}
            className="bg-primary text-white text-sm px-4 py-2 rounded-md font-medium"
          >
            View Forecast →
          </Link>
        </div>
      </header>

      <KpiCards kpis={kpis} liveTotal={liveTotal} />

      <FilterBar
        destinations={destinations}
        selectedId={selectedId}
        onChangeDestination={setSelectedId}
        days={days}
        onChangeDays={setDays}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveVisitorChart data={history} destinationName={selectedDestination?.name} />
          <DestinationBarChart trending={trending} onSelect={setSelectedId} selectedId={selectedId} />
          <TourismMap destinations={destinations} liveCounts={liveCounts} onSelect={setSelectedId} />
        </div>
        <div>
          <LiveFeedTicker events={recentEvents} connected={connected} />
        </div>
      </div>
    </div>
  );
}
