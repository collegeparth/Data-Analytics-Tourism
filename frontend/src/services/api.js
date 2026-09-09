import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_BASE_URL });

// Attach admin token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getDestinations = () => api.get("/destinations").then((r) => r.data);

export const getDestination = (id) => api.get(`/destinations/${id}`).then((r) => r.data);

export const getKpis = () => api.get("/stats/kpis").then((r) => r.data);

export const getTrending = () => api.get("/stats/trending").then((r) => r.data);

export const getHistory = (destinationId, days = 90) =>
  api.get(`/stats/history/${destinationId}`, { params: { days } }).then((r) => r.data);

export const getRecentBookings = (limit = 10) =>
  api.get("/stats/bookings/recent", { params: { limit } }).then((r) => r.data);

export const getForecast = (destinationId, horizon = 7) =>
  api.get(`/forecast/${destinationId}`, { params: { horizon } }).then((r) => r.data);

export const trainModel = (destinationId, modelType = "ensemble") =>
  api.post(`/models/train/${destinationId}`, { modelType }).then((r) => r.data);

export const getSavedModels = () => api.get("/models/saved").then((r) => r.data);

export const getCorrelation = (destinationId) =>
  api.get(`/analytics/correlation/${destinationId}`).then((r) => r.data);

export const getClusters = (k = 3) =>
  api.get("/analytics/clusters", { params: { k } }).then((r) => r.data);

export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export default api;
