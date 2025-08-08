// src/pages/Splash.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/select-school");
  };

  return (
    <div
      className="flex items-center justify-center h-screen bg-white cursor-pointer relative"
      onClick={handleClick}
    >
      {/* 🛠️ 나중에 로고 이미지 교체 시 사용 */}
      {/*
      <img
        src="/logo.png"
        alt="CNAPSS Logo"
        className="w-40 h-40 animate-pulse"
      />
      */}

      {/* ✅ 임시 텍스트 로고 */}
      <h1 className="text-6xl font-extrabold text-indigo-600 animate-pulse">
        CNAPSS
      </h1>

      <p className="absolute bottom-12 text-gray-400 text-sm animate-pulse">
        Click anywhere to continue
      </p>
    </div>
  );
};

export default Splash;



