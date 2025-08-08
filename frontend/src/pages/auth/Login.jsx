// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { useAuth } from "../../contexts/AuthContext";
import AsyncButton from "../../components/AsyncButton";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ 추가
  const from = location.state?.from || "/"; // ✅ 로그인 후 복귀 경로 설정

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const baseURL = import.meta.env.VITE_API_URL;

  const handleLogin = async () => {
    const res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.message || "";

      if (msg.toLowerCase().includes("user not found")) {
        const goToRegister = window.confirm(
          "No account found with this email.\nWould you like to sign up?"
        );
        if (goToRegister) {
          navigate("/register");
        }
      } else if (msg.toLowerCase().includes("incorrect password")) {
        alert("Incorrect password. Please try again.");
      } else {
        alert("Login failed. Please try again.");
      }
      throw new Error(msg);
    }

    login(data);
    navigate(from); // ✅ 로그인 후 원래 페이지로 이동
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Log In</h2>
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
          type="password"
          placeholder="Password"
          className="w-full border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AsyncButton
          onClick={handleLogin}
          loadingText="Logging in..."
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Log In
        </AsyncButton>
      </form>
    </div>
  );
}

export default Login;


 
