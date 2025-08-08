import { useEffect, useState } from "react";

const useNotificationsPolling = (email, interval = 10000) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!email) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/notifications/${email}`);
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error("🔔 알림 불러오기 실패:", err);
      }
    };

    fetchNotifications(); // 첫 실행

    const timer = setInterval(fetchNotifications, interval);
    return () => clearInterval(timer);
  }, [email, interval]);

  return notifications;
};

export default useNotificationsPolling;
