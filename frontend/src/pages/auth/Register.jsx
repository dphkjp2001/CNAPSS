// frontend/src/pages/auth/Register.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AsyncButton from "../../components/AsyncButton";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const baseURL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendCode = async () => {
    if (!email) return alert("Enter your email first.");
    if (cooldown) return;
    try {
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
    }
  };

  const verifyCode = async () => {
    if (!email || !code) return alert("Enter email and code.");
    try {
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
    }
  };

  const handleRegister = async () => {
    if (!emailVerified) {
      return alert("Please verify your email first.");
    }
    try {
      const res = await fetch(`${baseURL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || "Sign up failed.";
        if (msg.toLowerCase().includes("email already")) {
          const goToLogin = window.confirm(
            "An account with this email already exists.\nWould you like to log in instead?"
          );
          if (goToLogin) navigate("/login");
        } else if (msg.toLowerCase().includes("nickname")) {
          alert("This nickname is already taken. Please choose another.");
        } else {
          alert(msg);
        }
        return;
      }
      alert("Registration complete! You can log in now.");
      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
      alert("Unexpected error occurred. Please try again later.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Nickname"
          className="w-full border px-3 py-2"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

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
            disabled={!email || cooldown > 0 || emailVerified}
            className="bg-gray-100 px-3 py-2 rounded border"
            loadingText="Sending..."
          >
            {cooldown > 0 ? `Resend (${cooldown}s)` : codeSent ? "Resend" : "Send Code"}
          </AsyncButton>
          <AsyncButton
            onClick={verifyCode}
            disabled={!email || !code || emailVerified}
            className="bg-gray-800 text-white px-3 py-2 rounded"
            loadingText="Verifying..."
          >
            {emailVerified ? "Verified" : "Verify"}
          </AsyncButton>
        </div>

        <AsyncButton
          onClick={handleRegister}
          loadingText="Signing up..."
          className={`px-4 py-2 rounded text-white ${emailVerified ? "bg-blue-500" : "bg-blue-300 cursor-not-allowed"}`}
          disabled={!emailVerified}
        >
          Sign Up
        </AsyncButton>
      </form>
    </div>
  );
}

export default Register;
