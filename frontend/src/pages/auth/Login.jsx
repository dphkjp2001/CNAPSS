// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AsyncButton from "../../components/AsyncButton";

function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const baseURL = import.meta.env.VITE_API_URL;

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch(`${baseURL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = (data?.message || "Login failed").toLowerCase();
        if (msg.includes("user not found")) {
          const go = window.confirm("No account found for this email.\nGo to Sign Up?");
          if (go) navigate("/register", { state: { from } });
        } else if (msg.includes("incorrect password")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(data?.message || "Login failed. Please try again.");
        }
        return;
      }

      if (!data?.token || !data?.user) {
        console.error("Login failed: malformed response", data);
        alert("Login failed: missing token or user data from server.");
        return;
      }
      login({ user: data.user, token: data.token });

      // ✅ 항상 학교 대시보드 우선. 루트/선택/인증경로 등은 무시
      const school = data?.user?.school;
      const fallback = school ? `/${school}/dashboard` : "/";
      const bad = ["/", "/select-school", "/auth-required", "/login", "/register"];
      const dest = bad.includes(from) ? fallback : from || fallback;
      navigate(dest, { replace: true });
    } catch {
      setError("Unexpected error. Please try again.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Log In</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back to CNAPSS. Please sign in to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="your.email@school.edu"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <div className="flex items-stretch gap-2">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="rounded-xl border px-3 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <AsyncButton
              onClick={handleLogin}
              loadingText="Logging in..."
              className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              Log In
            </AsyncButton>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link to="/register" state={{ from }} className="font-semibold text-indigo-600 hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;






 
