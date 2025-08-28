// frontend/src/hooks/useNotificationsPolling.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { apiFetch } from "../api/http";

/**
 * Polling strategy:
 *  - Active tab: every 5s (default)
 *  - Inactive tab: every 60s (default)
 *  - minutes: recent window for server query (default: 5)
 *
 * Return:
 *  {
 *    items,            // list of notifications (usually unread from server)
 *    count,            // unread count with optimistic deduction
 *    refetch,          // force refresh
 *    optimisticRead,   // mark one as read in UI immediately
 *    markAsRead,       // call server to persist one as read
 *    markAllAsRead,    // mark all as read (optimistic + server)
 *  }
 */
export default function useNotificationsPolling(
  _email /* kept for backward-compat */,
  activeInterval = 5000,
  inactiveInterval = 60000,
  minutes = 5
) {
  const { user, token } = useAuth();
  const { school } = useSchool();

  const [items, setItems] = useState([]);
  const [optimistic, setOptimistic] = useState(() => new Set()); // clicked/read locally
  const timerRef = useRef(null);

  const base = useMemo(
    () => (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""),
    []
  );

  const fetchNotifications = useCallback(async () => {
    if (!token || !school) return;
    try {
      const url = `${base}/${school}/notification?minutes=${minutes}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      // 서버에서 이미 읽음 제외 목록만 내려준다면 optimistic 세트와의 교집합은 자연스레 사라짐
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("🔔 Failed to fetch notifications:", err);
    }
  }, [base, school, token, minutes]);

  const startPolling = useCallback(
    (delay) => {
      clearInterval(timerRef.current);
      fetchNotifications(); // fire immediately
      timerRef.current = setInterval(fetchNotifications, delay);
    },
    [fetchNotifications]
  );

  useEffect(() => {
    if (!token || !school) return;
    const isActive = document.visibilityState === "visible";
    startPolling(isActive ? activeInterval : inactiveInterval);

    const onVis = () =>
      startPolling(document.visibilityState === "visible" ? activeInterval : inactiveInterval);

    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [token, school, activeInterval, inactiveInterval, startPolling]);

  /** ===== optimistic helpers ===== */
  const optimisticRead = useCallback((id) => {
    if (!id) return;
    setOptimistic((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAsRead = useCallback(
    async (id) => {
      if (!id || !user?.email || !school) return;
      try {
        await apiFetch(`${base}/${school}/notification/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { commentId: id, email: user.email },
        });
      } catch {
        // 서버 실패해도 다음 폴링 시 보정됨
      }
    },
    [base, school, user?.email]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.email || !school) return;
    // 낙관적: 클라이언트 모두 읽음 처리
    setOptimistic((prev) => {
      const next = new Set(prev);
      items.forEach((n) => next.add(n._id));
      return next;
    });
    try {
      await apiFetch(`${base}/${school}/notification/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { email: user.email, minutes },
      });
    } catch {
      // ignore
    }
  }, [base, school, user?.email, items, minutes]);

  const refetch = fetchNotifications;

  // 뱃지 카운트 = 서버 목록 - 낙관적으로 읽은 아이템
  const count = useMemo(
    () => items.reduce((acc, n) => acc + (optimistic.has(n._id) ? 0 : 1), 0),
    [items, optimistic]
  );

  return { items, count, refetch, optimisticRead, markAsRead, markAllAsRead };
}



