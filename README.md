# Tourism Analytics and Demand Forecasting Platform

A full-stack, real-time web application built for a Project Based Learning
(PBL) / Experiential Learning Assessment. It tracks tourist destination
data, streams live visitor/booking activity to a dashboard over
WebSockets, and forecasts future demand using a lightweight, explainable
statistical model.

**No database installation or account signup required.** All data is
generated in-memory when the backend starts (~2 years of realistic
dummy history per destination) — just `npm install` + `npm run dev` on
both folders and you're running.

---

## 1. Architecture Overview

```
┌─────────────┐        REST API         ┌──────────────┐        ┌──────────────┐
│   Frontend   │ ──────────────────────► │   Backend     │ ─────► │ In-Memory     │
│ React + Vite │ ◄────────────────────── │ Node/Express  │ ◄───── │ Data Store    │
│   Dashboard  │      Socket.IO (WS)     │ + Socket.IO   │        │ (plain JS)    │
└─────────────┘ ◄──────────────────────  └──────┬────────┘        └──────────────┘
                                                  │
                                     setInterval  │  every few seconds
                                                  ▼
                                     Live Data Simulator
                                (generates fake bookings / visitor ticks
                                 since we have no real IoT/booking feed)
```

**Why in-memory instead of MongoDB?** For a student project, the goal
is to demonstrate the architecture (real-time layer, forecasting logic,
dashboard) without fighting database installation or cloud account
setup. `backend/src/data/store.js` holds everything in plain JS arrays,
seeded fresh on every server start. If you want real persistence later,
that's the only file you'd need to swap for an actual database layer —
the routes and forecasting logic don't change.

- **Frontend (React + Vite + Tailwind)** — renders the dashboard, charts
  (Recharts), and map (Leaflet). Connects to the backend two ways:
  1. **REST calls** (axios) for historical data, KPIs, and forecasts.
  2. **Socket.IO** for live, push-based updates (no polling needed for
     live visitor counts / bookings).

- **Backend (Node.js + Express)** — exposes REST endpoints, runs the
  forecasting engine, and hosts a Socket.IO server. A background
  `liveDataSimulator` ticks every few seconds, writes a new booking to
  the in-memory store, and emits the update to all connected dashboards instantly.

- **Data layer (in-memory store)** — `backend/src/data/store.js` holds
  destinations, 2 years of historical daily visitor stats, weather
  data, events/festivals, and bookings as plain JS arrays. Regenerated
  fresh on every server start.

- **Forecasting** — implemented in plain JavaScript inside the backend
  (`src/services/forecastEngine.js`) so the whole stack stays in one
  language. See section 4 below for how it works.

---

## 2. How "Real-Time" Works Here

Since we don't have access to real tourism booking APIs or IoT visitor
sensors, we **simulate** a real-time feed:

1. `liveDataSimulator.js` runs a `setInterval` on the backend (every
   ~4 seconds by default).
2. Each tick, it picks a random destination, bumps its "live visitor
   count" in memory, and — 40% of the time — adds a new booking record
   to the in-memory store.
3. It emits this event over Socket.IO (`io.emit("live-update", payload)`)
   to every connected browser.
4. The frontend's `useSocket.js` hook listens for `live-update` and
   `live-snapshot` events and updates React state — charts and KPI
   cards re-render immediately, with **no page refresh and no polling**
   needed for the live parts.

This is a standard, honest way to demonstrate real-time architecture in
a student project without needing paid third-party data feeds.

---

## 3. Setup Instructions

### Prerequisites
- Node.js 18+ and npm — that's it, no database to install.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# defaults work out of the box, no editing required

npm run dev         # starts the server with nodemon (or `npm start`)
```

Data (8 destinations + ~2 years of daily history each) is generated
automatically in memory the moment the server starts — you'll see a
"Seeding in-memory data store..." line in the console. No separate
seed command needed.

Backend runs on **http://localhost:5000**. Health check:
`GET http://localhost:5000/api/health`

Default admin login (from `.env`): `admin@tourism.com` / `admin123`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# defaults already point to http://localhost:5000

npm run dev
```

Frontend runs on **http://localhost:5173** — open it in your browser.
The dashboard loads automatically; live data starts flowing within a
few seconds as the backend's simulator ticks.

---

## 4. How the Forecasting Model Works (for viva/report)

File: `backend/src/services/forecastEngine.js`

We use two simple, explainable techniques combined:

1. **Linear trend regression** — fit `y = m·x + c` on the visitor
   counts over time (x = day index) using ordinary least squares. This
   captures whether demand is generally rising or falling.

2. **Weekly seasonal index** — for each weekday (Sun–Sat), compute the
   average ratio of that weekday's visitor count to the overall
   average. E.g., if Saturdays average 1.25× the daily average, the
   seasonal index for Saturday is 1.25.

**Final forecast** = `trend_value_at_future_day × seasonal_index[weekday]`

**Accuracy evaluation**: the model is trained on the first 80% of
historical days and tested on the remaining 20% (a standard
train/test split for time series). We report:
- **MAE** (Mean Absolute Error) — average prediction error in visitors/day
- **RMSE** (Root Mean Squared Error) — penalizes larger errors more

A ±10% band is drawn around each forecast point on the chart as a
simple visual confidence range.

**Why this approach for a student project**: it needs no external ML
libraries or Python service, runs instantly, and every step can be
explained on a whiteboard — which matters for a PBL viva where you may
be asked "walk me through the math."

---

## 5. Key API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/destinations` | List all destinations |
| GET | `/api/stats/history/:destinationId?days=90` | Historical daily visitor counts |
| GET | `/api/stats/kpis` | Dashboard KPI summary |
| GET | `/api/stats/trending` | Destinations ranked by live visitor count |
| GET | `/api/stats/bookings/recent?limit=10` | Recent bookings |
| GET | `/api/forecast/:destinationId?horizon=7` | Forecast + accuracy metrics |
| GET | `/api/analytics/correlation/:destinationId` | Pearson correlation: weather vs visitor counts |
| GET | `/api/analytics/clusters?k=3` | K-Means clustering of destinations by demand pattern |
| POST | `/api/auth/login` | Admin login (returns JWT) |
| WS | `live-snapshot`, `live-update` (Socket.IO events) | Real-time push updates |

---

## 6. Analytics Algorithms (for viva/report)

Two additional algorithms live in `backend/src/services/`, both hand-rolled
in plain JavaScript (no external stats/ML library) so every step can be
explained on a whiteboard:

**`correlationEngine.js` — Pearson Correlation**
Measures how strongly weather (temperature, rainfall) relates to daily
visitor counts, using the standard formula:
`r = Σ((x-x̄)(y-ȳ)) / √(Σ(x-x̄)² · Σ(y-ȳ)²)`. Also breaks down average
visitors by weather condition (sunny/cloudy/rainy/stormy) for an
easy-to-read comparison.

**`clusteringEngine.js` — K-Means Clustering**
Groups destinations into K clusters (e.g., Low/Medium/High demand) based
on 4 features per destination: average visitors, weekend uplift ratio,
volatility (std. dev.), and seasonal swing. Features are min-max
normalized, then standard Lloyd's K-Means (assign → recompute centroids,
repeat until stable) groups similar destinations together. Clusters are
labeled by their average demand level so the output reads naturally
("Manali → High Demand") instead of just numeric cluster IDs.

Both are exposed via `/api/analytics/*` and visualized on the frontend's
**Data Analytics** page (bar chart for correlation, scatter plot +
table for clusters).

---

## 7. Project Structure

```
tourism-analytics-platform/
├── backend/
│   ├── src/
│   │   ├── data/store.js      # in-memory data store (destinations, stats, bookings, seeding)
│   │   ├── routes/            # destinations, stats, forecast, analytics, auth
│   │   ├── services/          # forecastEngine, correlationEngine, clusteringEngine, liveDataSimulator
│   │   ├── sockets/           # socketHandler.js
│   │   ├── middleware/        # authMiddleware.js
│   │   └── app.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/        # KpiCards, LiveVisitorChart, DestinationBarChart,
│       │                        ForecastChart, TourismMap, FilterBar, LiveFeedTicker
│       ├── pages/              # Dashboard, ForecastPage, AnalyticsPage, Login
│       ├── hooks/useSocket.js
│       ├── services/api.js
│       └── App.jsx
└── README.md
```

---

## 8. Possible Extensions (for extra marks)
- Swap the JS forecasting engine for a Python microservice using
  `statsmodels` (ARIMA) or `Prophet`, exposed via FastAPI, called from
  the Node backend.
- Add a real weather API (e.g., OpenWeatherMap free tier) instead of
  simulated weather data.
- Role-based auth (admin vs read-only viewer).
- Export forecast reports as PDF (there's a `pdf` skill/tool available
  if generating this from Claude).
