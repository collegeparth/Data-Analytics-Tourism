import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDestinations, getCorrelation, getClusters } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from "recharts";

const CLUSTER_COLORS = {
  "Low Demand": "#0891b2",
  "Medium Demand": "#f59e0b",
  "High Demand": "#dc2626",
  "Very High Demand": "#7c2d12",
};

export default function AnalyticsPage() {
  const [destinations, setDestinations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [clusters, setClusters] = useState(null);
  const [k, setK] = useState(3);
  const [error, setError] = useState("");

  useEffect(() => {
    getDestinations().then((dests) => {
      setDestinations(dests);
      if (dests.length) setSelectedId(dests[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getCorrelation(selectedId).then(setCorrelation).catch((e) => setError(e?.response?.data?.message || "Error"));
  }, [selectedId]);

  useEffect(() => {
    getClusters(k).then(setClusters).catch((e) => setError(e?.response?.data?.message || "Error"));
  }, [k]);

  const selectedDestination = destinations.find((d) => d._id === selectedId);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Data Analytics</h1>
          <p className="text-sm text-slate-500">Correlation analysis & destination clustering</p>
        </div>
        <Link to="/dashboard" className="text-sm text-primary font-medium">← Back to Dashboard</Link>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Correlation Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-600">Weather vs Visitor Correlation (Pearson r)</h3>
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

        {correlation && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Temperature vs Visitors</p>
                <p className="text-2xl font-semibold text-slate-800">{correlation.temperatureVsVisitors.r}</p>
                <p className="text-xs text-slate-400 capitalize">{correlation.temperatureVsVisitors.interpretation} relationship</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Rainfall vs Visitors</p>
                <p className="text-2xl font-semibold text-slate-800">{correlation.rainfallVsVisitors.r}</p>
                <p className="text-xs text-slate-400 capitalize">{correlation.rainfallVsVisitors.interpretation} relationship</p>
              </div>
            </div>

            <h4 className="text-xs font-semibold text-slate-500 mb-2">Average Visitors by Weather Condition</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={correlation.averageVisitorsByCondition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="condition" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="averageVisitors" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2">
              Based on {correlation.sampleSize} days of matched weather + visitor data for {selectedDestination?.name}.
              r close to 0 means little linear relationship; closer to -1 or +1 means a stronger one.
            </p>
          </>
        )}
      </div>

      {/* Clustering Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-600">Destination Clustering (K-Means)</h3>
          <select
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
          >
            <option value={2}>K = 2</option>
            <option value={3}>K = 3</option>
            <option value={4}>K = 4</option>
          </select>
        </div>

        {clusters && (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="features.averageVisitors"
                  name="Avg Visitors"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Average Visitors/day", position: "insideBottom", offset: -5, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="features.volatility"
                  name="Volatility"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Volatility (std dev)", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <ZAxis range={[100, 100]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={() => ""}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-md p-2 text-xs shadow-sm">
                        <strong>{d.name}</strong>
                        <div>{d.clusterLabel}</div>
                        <div>Avg visitors: {d.features.averageVisitors}</div>
                        <div>Volatility: {d.features.volatility}</div>
                      </div>
                    );
                  }}
                />
                <Scatter data={clusters.destinations}>
                  {clusters.destinations.map((d) => (
                    <Cell key={d.destinationId} fill={CLUSTER_COLORS[d.clusterLabel] || "#6366f1"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>

            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2">Destination</th>
                  <th className="py-2">Cluster</th>
                  <th className="py-2">Avg Visitors</th>
                  <th className="py-2">Weekend Uplift</th>
                  <th className="py-2">Volatility</th>
                  <th className="py-2">Seasonality Swing</th>
                </tr>
              </thead>
              <tbody>
                {clusters.destinations.map((d) => (
                  <tr key={d.destinationId} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-700">{d.name}</td>
                    <td className="py-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs text-white"
                        style={{ backgroundColor: CLUSTER_COLORS[d.clusterLabel] || "#6366f1" }}
                      >
                        {d.clusterLabel}
                      </span>
                    </td>
                    <td className="py-2">{d.features.averageVisitors}</td>
                    <td className="py-2">{d.features.weekendUpliftRatio}x</td>
                    <td className="py-2">{d.features.volatility}</td>
                    <td className="py-2">{d.features.seasonalitySwing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-3">
              K-Means groups destinations by 4 features: average demand, weekend uplift ratio,
              day-to-day volatility, and seasonal swing — normalized 0-1 before clustering so no
              single feature dominates.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
