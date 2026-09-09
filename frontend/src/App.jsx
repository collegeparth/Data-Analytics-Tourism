import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ForecastPage from "./pages/ForecastPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/forecast/:destinationId" element={<ForecastPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
