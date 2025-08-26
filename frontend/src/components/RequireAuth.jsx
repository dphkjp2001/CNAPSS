// src/components/RequireAuth.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { openGate } from "../utils/gateBus";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const full = `${location.pathname}${location.search || ""}`;

  useEffect(() => {
    if (!user) openGate(full);
  }, [user, full]);

  if (!user) return null; // Don't render protected content

  return children;
}

