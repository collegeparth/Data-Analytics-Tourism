import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// Combines the tail of historical data with the future forecast so the
// viewer can see the transition from actual -> predicted clearly.
export default function ForecastChart({ history, forecastResult }) {
  if (!forecastResult) return null;

  const recentHistory = (history || []).slice(-30).map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    actual: h.visitorCount,
  }));

  const futurePoints = forecastResult.forecast.map((f) => ({
    date: new Date(f.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    predicted: f.predicted,
    range: [f.lowerBound, f.upperBound],
  }));

  const combined = [...recentHistory, ...futurePoints];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-600">Demand Forecast — Historical vs Predicted</h3>
        <div className="text-xs text-slate-500 flex gap-4">
          <span>MAE: <strong>{forecastResult.accuracy.mae}</strong></span>
          <span>RMSE: <strong>{forecastResult.accuracy.rmse}</strong></span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={combined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="range" stroke="none" fill="#f59e0b" fillOpacity={0.15} name="Confidence Range" />
          <Line type="monotone" dataKey="actual" stroke="#0f766e" strokeWidth={2} dot={false} name="Actual" />
          <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2">
        Method: {forecastResult.method} · Trained on {forecastResult.trainSize} days, tested on {forecastResult.testSize} days.
      </p>
    </div>
  );
}
