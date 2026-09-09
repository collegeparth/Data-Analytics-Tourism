import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

// Color-codes each destination marker by its live visitor count so busy
// destinations stand out at a glance.
function getColor(count) {
  if (count > 150) return "#dc2626"; // red - very busy
  if (count > 80) return "#f59e0b"; // amber - moderately busy
  return "#0f766e"; // teal - normal
}

export default function TourismMap({ destinations, liveCounts, onSelect }) {
  const center = [22.5, 79]; // roughly center of India

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-600 mb-3">Destination Map — Live Demand</h3>
      <MapContainer center={center} zoom={4.5} style={{ height: "360px", width: "100%", borderRadius: "0.5rem" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {(destinations || []).map((dest) => {
          const count = liveCounts?.[dest._id] || 0;
          return (
            <CircleMarker
              key={dest._id}
              center={[dest.latitude, dest.longitude]}
              radius={8 + Math.min(count / 20, 12)}
              pathOptions={{ color: getColor(count), fillColor: getColor(count), fillOpacity: 0.6 }}
              eventHandlers={{ click: () => onSelect && onSelect(dest._id) }}
            >
              <Popup>
                <strong>{dest.name}</strong>
                <br />
                {dest.category} — {dest.state}
                <br />
                Live visitors: {count}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
