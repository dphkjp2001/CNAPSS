// 📁 파일 경로: frontend/src/pages/auth/Register.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AsyncButton from "../../components/AsyncButton";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  const baseURL = import.meta.env.VITE_API_URL;

  const handleRegister = async () => {
    try {
      const res = await fetch(`${baseURL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || "";

        if (msg.toLowerCase().includes("email already")) {
          const goToLogin = window.confirm("An account with this email already exists.\nWould you like to log in instead?");
          if (goToLogin) {
            navigate("/login");
          }
        } else if (msg.toLowerCase().includes("nickname")) {
          alert("This nickname is already taken. Please choose another.");
        } else {
          alert("Sign up failed. Please try again later.");
        }

        return;
      }

      alert("Registration successful! Please check your email to verify.");
      navigate("/login"); // ✅ 여기만 바뀐 부분!

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
          placeholder="NYU Email"
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
        <AsyncButton
          onClick={handleRegister}
          loadingText="Signing up..."
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Sign Up
        </AsyncButton>
      </form>
    </div>
  );
}

export default Register;
