import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#0f766e", "#f59e0b", "#6366f1", "#e11d48", "#0891b2", "#65a30d", "#9333ea", "#d97706"];

// Live comparison of all destinations by current live visitor count.
export default function DestinationBarChart({ trending, onSelect, selectedId }) {
  const chartData = (trending || []).map((t) => ({
    id: t.destinationId,
    name: t.name,
    visitors: t.liveVisitorCount,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-600 mb-3">Live Destination Comparison</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} onClick={(e) => {
          const point = e?.activePayload?.[0]?.payload;
          if (point && onSelect) onSelect(point.id);
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="visitors" radius={[4, 4, 0, 0]} cursor="pointer">
            {chartData.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={COLORS[index % COLORS.length]}
                opacity={selectedId === entry.id ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2">Tip: click a bar to view that destination's trend & forecast.</p>
    </div>
  );
}
