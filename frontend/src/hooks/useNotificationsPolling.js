// frontend/src/hooks/useNotificationsPolling.js

import { useEffect, useState, useRef } from "react";

const useNotificationsPolling = (email, activeInterval = 5000, inactiveInterval = 60000, minutes = 5) => {
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotifications = async () => {
    if (!email) return;
    try {
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const res = await fetch(`${base}/api/notification/${encodeURIComponent(email)}?minutes=${minutes}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("🔔 알림 불러오기 실패:", err);
    }
  };

  const startPolling = (delay) => {
    clearInterval(intervalRef.current);
    fetchNotifications(); // 즉시 1번 실행
    intervalRef.current = setInterval(fetchNotifications, delay);
  };

  useEffect(() => {
    if (!email) return;

    // 초기: 활성화 상태인지 판단
    const isActive = document.visibilityState === "visible";
    startPolling(isActive ? activeInterval : inactiveInterval);

    // 포커스/백그라운드 전환 감지
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling(activeInterval);
      } else {
        startPolling(inactiveInterval);
      }
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

