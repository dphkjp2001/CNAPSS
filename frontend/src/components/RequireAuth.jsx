// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // ✅ '/auth-required' 페이지가 from이면 무한 루프 방지를 위해 '/'로 대체
    const from = location.pathname === "/auth-required" ? "/" : location.pathname;
    return <Navigate to="/auth-required" replace state={{ from }} />;
  }

  return children;
}

export default RequireAuth;

