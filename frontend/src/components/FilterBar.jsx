export default function FilterBar({ destinations, selectedId, onChangeDestination, days, onChangeDays }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-4 items-center">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Destination</label>
        <select
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
          value={selectedId || ""}
          onChange={(e) => onChangeDestination(e.target.value)}
        >
          {(destinations || []).map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">History Range</label>
        <select
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
          value={days}
          onChange={(e) => onChangeDays(Number(e.target.value))}
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
          <option value={365}>Last 1 year</option>
        </select>
      </div>
    </div>
  );
}
