// frontend/src/hooks/useNotificationsPolling.js
import { useEffect, useState, useRef } from "react";

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
    fetchNotifications(); // 즉시 1번 실행
    intervalRef.current = setInterval(fetchNotifications, delay);
  };

  useEffect(() => {
    if (!email) return;

    // 초기: 현재 탭 상태에 맞춰 시작
    const isActive = document.visibilityState === "visible";
    startPolling(isActive ? activeInterval : inactiveInterval);

    // 탭 활성/비활성 전환 시 간격 변경
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


