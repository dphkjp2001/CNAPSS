// src/components/RequireAuth.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { openGate } from "../utils/gateBus";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const from = `${pathname}${search || ""}`;

  // Open the login gate modal when not authenticated
  useEffect(() => {
    if (!user) openGate(from);
  }, [user, from]);

  if (user) return children;

  // Small fallback so page is never blank while the modal opens
  return (
    <div className="p-8 text-center text-sm text-gray-600">
      This feature requires login. Opening sign-in dialog…
    </div>
  );
}


