import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("admin@tourism.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await login(email, password);
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm">
        <h1 className="text-lg font-semibold text-slate-800 mb-1">Admin Login</h1>
        <p className="text-sm text-slate-500 mb-6">Tourism Analytics Platform</p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <label className="block text-xs text-slate-500 mb-1">Email</label>
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-xs text-slate-500 mb-1">Password</label>
        <input
          type="password"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="w-full bg-primary text-white rounded-md py-2 text-sm font-medium">
          Login
        </button>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Dashboard is viewable without login too — this is only for admin actions.
        </p>
      </form>
    </div>
  );
}
