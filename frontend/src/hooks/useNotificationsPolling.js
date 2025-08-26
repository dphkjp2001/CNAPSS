// frontend/src/hooks/useNotificationsPolling.js
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { apiFetch } from "../api/http";

/**
 * Polling strategy:
 * - Active tab: every 5s
 * - Inactive tab: every 60s
 * - Backend returns ONLY unread items
 *
 * Signature (backward-compatible):
 *   useNotificationsPolling(email, activeInterval=5000, inactiveInterval=60000, minutes=5)
 * Note: "email" param is ignored now (server uses req.user.email).
 */
const useNotificationsPolling = (
  _email,
  activeInterval = 5000,
  inactiveInterval = 60000,
  minutes = 5
) => {
  const { token } = useAuth();
  const { school } = useSchool();
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token || !school) return;
    try {
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const url = `${base}/${school}/notification?minutes=${minutes}`;
      const res = await apiFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("🔔 Failed to fetch notifications:", err);
    }
  };

  const startPolling = (delay) => {
    clearInterval(intervalRef.current);
    fetchNotifications(); // fire immediately once
    intervalRef.current = setInterval(fetchNotifications, delay);
  };

  useEffect(() => {
    if (!token || !school) return;

    const isActive = document.visibilityState === "visible";
    startPolling(isActive ? activeInterval : inactiveInterval);

    const handleVisibilityChange = () => {
      startPolling(document.visibilityState === "visible" ? activeInterval : inactiveInterval);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, school, activeInterval, inactiveInterval, minutes]);

  return notifications;
};

export default useNotificationsPolling;


