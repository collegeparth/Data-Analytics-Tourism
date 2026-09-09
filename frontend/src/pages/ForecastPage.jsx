import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDestinations, getHistory, getForecast } from "../services/api";
import FilterBar from "../components/FilterBar";
import ForecastChart from "../components/ForecastChart";

export default function ForecastPage() {
  const { destinationId } = useParams();
  const navigate = useNavigate();

  const [destinations, setDestinations] = useState([]);
  const [selectedId, setSelectedId] = useState(destinationId || null);
  const [horizon, setHorizon] = useState(7);
  const [history, setHistory] = useState([]);
  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getDestinations().then((dests) => {
      setDestinations(dests);
      if (!selectedId && dests.length) setSelectedId(dests[0]._id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) navigate(`/forecast/${selectedId}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    Promise.all([getHistory(selectedId, 365), getForecast(selectedId, horizon)])
      .then(([hist, forecast]) => {
        setHistory(hist);
        setForecastResult(forecast);
      })
      .catch((err) => setError(err?.response?.data?.message || "Could not load forecast"))
      .finally(() => setLoading(false));
  }, [selectedId, horizon]);

  const selectedDestination = destinations.find((d) => d._id === selectedId);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Demand Forecast</h1>
          <p className="text-sm text-slate-500">
            Predicted tourist demand {selectedDestination ? `for ${selectedDestination.name}` : ""}
          </p>
        </div>
        <Link to="/dashboard" className="text-sm text-primary font-medium">← Back to Dashboard</Link>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Destination</label>
          <select
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {destinations.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Forecast Horizon</label>
          <select
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            <option value={7}>Next 7 days</option>
            <option value={30}>Next 30 days</option>
            <option value={90}>Next 90 days</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Generating forecast...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && forecastResult && (
        <>
          <ForecastChart history={history} forecastResult={forecastResult} />

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">How this forecast works</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We fit a simple linear trend line on {forecastResult.trainSize + forecastResult.testSize} days
              of historical visitor data, then multiply it by a weekly seasonal index
              (e.g., weekends typically see more visitors than weekdays). Accuracy is
              measured by holding out the last 20% of historical data as a test set —
              current Mean Absolute Error is <strong>{forecastResult.accuracy.mae}</strong> visitors/day,
              and RMSE is <strong>{forecastResult.accuracy.rmse}</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
