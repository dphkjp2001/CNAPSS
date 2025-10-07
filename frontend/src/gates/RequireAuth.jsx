import React from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Navigate, useLocation, useParams } from "react-router-dom";

/** Protects routes. Assumes useAuth() gives { user, loading } */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const params = useParams();

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!user) {
    // Keep school param so we can restore later.
    const to = params.school ? `/${params.school}` : "/";
    return <Navigate to={to} state={{ from: location }} replace />;
  }
  return children;
}
