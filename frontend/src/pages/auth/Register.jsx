// 📁 frontend/src/pages/auth/Register.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AsyncButton from "../../components/AsyncButton";
import { useAuth } from "../../contexts/AuthContext";

// Keep this synced with backend allowedSchools
const ALLOWED_SCHOOLS = [
  { value: "nyu", label: "NYU" },
  { value: "columbia", label: "Columbia" },
  { value: "boston", label: "Boston" },
];

function Register() {
  const navigate = useNavigate();
  const { school: schoolParam } = useParams(); // when route is /register/:school
  const location = useLocation();
  const { login } = useAuth();

  // -----------------------------
  // Form states
  // -----------------------------
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [school, setSchool] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  const baseURL = import.meta.env.VITE_API_URL;

  // -----------------------------
  // Prefill school
  // Priority:
  // 1) URL param (:school)
  // 2) navigation state prefill (e.g., from a modal CTA)
  // 3) localStorage lastVisitedSchool
  // -----------------------------
  useEffect(() => {
    const fromState = location?.state?.prefillSchool;
    const fromStorage = localStorage.getItem("lastVisitedSchool") || "";
    const candidate = (schoolParam || fromState || fromStorage || "").toLowerCase();

    // ensure candidate is allowed
    const valid = ALLOWED_SCHOOLS.some((s) => s.value === candidate);
    setSchool(valid ? candidate : "");
  }, [schoolParam, location?.state?.prefillSchool]);

  // -----------------------------
  // Cooldown timer for resend
  // -----------------------------
  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const sendCode = async () => {
    if (!email) return alert("Enter your email first.");
    if (cooldown) return;
    try {
      setBusy(true);
      const res = await fetch(`${baseURL}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send code");
      setCodeSent(true);
      setCooldown(60); // 60s resend cooldown
      alert("Verification code sent. Please check your email.");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!email || !code) return alert("Enter email and code.");
    try {
      setBusy(true);
      const res = await fetch(`${baseURL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Verification failed");
      setEmailVerified(true);
      alert("Email verified!");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!emailVerified) return alert("Please verify your email first.");
    if (!school) return alert("Please select your school.");

    try {
      setBusy(true);
      const res = await fetch(`${baseURL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ include school
        body: JSON.stringify({ email, password, nickname, school }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || "Sign up failed.";
        if (msg.toLowerCase().includes("email already")) {
          const goToLogin = window.confirm(
            "An account with this email already exists.\nWould you like to log in instead?"
          );
          if (goToLogin) navigate("/login", { replace: true });
        } else if (msg.toLowerCase().includes("nickname")) {
          alert("This nickname is already taken. Please choose another.");
        } else if (msg.toLowerCase().includes("invalid school")) {
          alert("Please choose a valid school.");
        } else {
          alert(msg);
        }
        return;
      }

      // If backend returns token + user (recommended), log in immediately
      if (data?.user && data?.token) {
        try {
          login({ user: data.user, token: data.token });
        } catch (e) {
          // If current AuthContext doesn't yet accept token, ignore
          console.warn("login() did not store token (update AuthContext to store it).");
        }
        // Navigate to the chosen school dashboard
        const dest = `/${data.user.school}/dashboard`;
        alert("Registration complete! Welcome 👋");
        navigate(dest, { replace: true });
        return;
      }

      // Legacy fallback: no token/user in response
      alert("Registration complete! You can log in now.");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Register error:", err);
      alert("Unexpected error occurred. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  const schoolOptions = useMemo(
    () =>
      ALLOWED_SCHOOLS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      )),
    []
  );

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Sign Up</h2>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          className="w-full border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {/* Nickname */}
        <input
          type="text"
          placeholder="Nickname"
          className="w-full border px-3 py-2"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          className="w-full border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        {/* School select (prefilled but changeable) */}
        <div className="mt-2">
          <label className="block mb-1 font-medium">School</label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
            className="w-full border px-3 py-2"
          >
            <option value="">Select your school</option>
            {schoolOptions}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Prefilled from the school you were browsing. You can change it if needed.
          </p>
        </div>

        {/* Email verification row */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Verification Code"
            className="flex-1 border px-3 py-2 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            inputMode="latin"
          />
          <AsyncButton
            onClick={sendCode}
            disabled={!email || cooldown > 0 || emailVerified || busy}
            className="bg-gray-100 px-3 py-2 rounded border"
            loadingText="Sending..."
          >
            {cooldown > 0 ? `Resend (${cooldown}s)` : codeSent ? "Resend" : "Send Code"}
          </AsyncButton>
          <AsyncButton
            onClick={verifyCode}
            disabled={!email || !code || emailVerified || busy}
            className="bg-gray-800 text-white px-3 py-2 rounded"
            loadingText="Verifying..."
          >
            {emailVerified ? "Verified" : "Verify"}
          </AsyncButton>
        </div>

        {/* Submit */}
        <AsyncButton
          onClick={handleRegister}
          loadingText="Signing up..."
          className={`px-4 py-2 rounded text-white ${
            emailVerified && school ? "bg-blue-500" : "bg-blue-300 cursor-not-allowed"
          }`}
          disabled={!emailVerified || !school || busy}
        >
          Sign Up
        </AsyncButton>
      </form>
    </div>
  );
}

export default Register;

