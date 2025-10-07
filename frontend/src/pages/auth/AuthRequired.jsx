// src/pages/auth/AuthRequired.jsx
import { useLocation, useNavigate } from "react-router-dom";
import React from "react";

function AuthRequired() {
  const location = useLocation();
  const navigate = useNavigate();

  const from = location.state?.from || "/"; // ✅ 원래 가려던 경로

  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold mb-4">🔒 Access Restricted</h2>
      <p className="mb-4 text-gray-700">
        You need to <strong>log in or sign up</strong> to use this feature.
      </p>
      <div className="flex justify-center gap-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => navigate("/login", { state: { from } })} // ✅ 로그인 시 원래 위치로 보내기
        >
          Log In
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded"
          onClick={() => navigate("/register", { state: { from } })}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}

export default AuthRequired;
