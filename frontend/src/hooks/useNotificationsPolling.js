// frontend/src/hooks/useNotificationsPolling.js
import { useEffect, useState, useRef } from "react";

/**
 * Polling strategy:
 * - Active tab: every 5s
 * - Inactive tab: every 60s
 * - Backend returns ONLY unread items (filtered by readBy on server)
 *
 * Assumes:
 *   VITE_API_URL = https://api.cnapss.com/api
 * Backend endpoints:
 *   GET  /notification/:email?minutes=5
 *   POST /notification/mark-read
 *   POST /notification/mark-all-read
 */
const useNotificationsPolling = (
  email,
  activeInterval = 5000,
  inactiveInterval = 60000,
  minutes = 5
) => {
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotifications = async () => {
    if (!email) return;
    try {
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""); // e.g. https://api.cnapss.com/api
      const url = `${base}/notification/${encodeURIComponent(email)}?minutes=${minutes}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text?.slice(0, 120) || ""}`);
      }
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("🔔 알림 불러오기 실패:", err);
    }
  };

  const startPolling = (delay) => {
    clearInterval(intervalRef.current);
    fetchNotifications(); // fire immediately once
    intervalRef.current = setInterval(fetchNotifications, delay);
  };

  useEffect(() => {
    if (!email) return;

    // start with current tab state
    const isActive = document.visibilityState === "visible";
    startPolling(isActive ? activeInterval : inactiveInterval);

    // adjust interval on visibility change
    const handleVisibilityChange = () => {
      startPolling(document.visibilityState === "visible" ? activeInterval : inactiveInterval);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [email, activeInterval, inactiveInterval, minutes]);

  return notifications;
};

export default useNotificationsPolling;

