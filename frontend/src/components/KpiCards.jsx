export default function KpiCards({ kpis, liveTotal }) {
  const cards = [
    {
      label: "Live Visitors Today",
      value: liveTotal ?? kpis?.totalLiveVisitorsToday ?? "-",
      accent: "bg-primary",
    },
    {
      label: "Today's Bookings",
      value: kpis?.todaysBookings ?? "-",
      accent: "bg-secondary",
    },
    {
      label: "Top Destination",
      value: kpis?.topDestination ?? "-",
      accent: "bg-indigo-600",
    },
    {
      label: "Model Accuracy",
      value: kpis?.modelAccuracy !== null && kpis?.modelAccuracy !== undefined ? `${Number(kpis.modelAccuracy).toFixed(1)} MAE` : "No model",
      accent: "bg-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-2"
        >
          <span className={`h-1.5 w-10 rounded-full ${card.accent}`} />
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="text-2xl font-semibold text-slate-800">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
