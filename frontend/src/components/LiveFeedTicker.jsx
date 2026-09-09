export default function LiveFeedTicker({ events, connected }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-600">Live Activity Feed</h3>
        <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-600" : "text-red-500"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {(!events || events.length === 0) && (
          <p className="text-sm text-slate-400">Waiting for live events...</p>
        )}
        {(events || []).map((e, i) => (
          <div key={`${e.destinationId}-${e.timestamp}-${i}`} className="text-xs border-b border-slate-100 pb-2">
            <span className="font-medium text-slate-700">{e.destinationName}</span>{" "}
            <span className="text-slate-500">
              — live count now {e.liveVisitorCount}
              {e.newBooking ? ` · new booking by ${e.newBooking.touristName} (${e.newBooking.numberOfPeople} people)` : ""}
            </span>
            <div className="text-slate-400">{new Date(e.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
