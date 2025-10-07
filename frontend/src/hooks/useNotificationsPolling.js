// frontend/src/hooks/useNotificationsPolling.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";

/**
 * Polling strategy:
 *  - Active tab: every 5s (default)
 *  - Inactive tab: every 60s (default)
 *  - minutes: recent window for server query (default: 5)
 *
 * Returns:
 *  {
 *    items,
 *    count,
 *    refetch,
 *    optimisticRead,
 *    dismiss,
 *    markAsRead,
 *    markAllAsRead,
 *  }
 */
export default function useNotificationsPolling(
  _email /* backward-compat */,
  activeInterval = 5000,
  inactiveInterval = 60000,
  minutes = 5
) {
  const { token } = useAuth();
  const { school } = useSchool();

  const [itemsRaw, setItemsRaw] = useState([]);
  const [optimistic, setOptimistic] = useState(() => new Set());
  const [dismissed, setDismissed] = useState(() => new Set());
  const timerRef = useRef(null);

  const base = useMemo(
    () => (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""),
    []
  );

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    }),
    [token]
  );

  const fetchNotifications = useCallback(async () => {
    if (!token || !school) return;
    try {
      const url = `${base}/${school}/notification?minutes=${minutes}`;
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setItemsRaw(list);
      // 서버에서 내려오지 않는(사라진) 항목 정리
      setDismissed((prev) => {
        const serverIds = new Set(list.map((n) => n._id));
        const next = new Set([...prev].filter((id) => serverIds.has(id)));
        return next;
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("🔔 Failed to fetch notifications:", err);
    }
  }, [authHeaders, base, school, token, minutes]);

  const startPolling = useCallback(
    (delay) => {
      clearInterval(timerRef.current);
      fetchNotifications(); // fire immediately
      timerRef.current = setInterval(fetchNotifications, delay);
    },
    [fetchNotifications]
  );

  // active/inactive interval
  useEffect(() => {
    const onVisibility = () => {
      const delay = document.hidden ? inactiveInterval : activeInterval;
      startPolling(delay);
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeInterval, inactiveInterval, startPolling]);

  // exposed helpers
  const items = useMemo(
    () => itemsRaw.filter((n) => !dismissed.has(n._id)),
    [itemsRaw, dismissed]
  );
  const count = useMemo(
    () => items.filter((n) => !optimistic.has(n._id)).length,
    [items, optimistic]
  );

  const optimisticRead = useCallback((id) => {
    setOptimistic((s) => new Set([...s, id]));
  }, []);

  const dismiss = useCallback((id) => {
    setDismissed((s) => new Set([...s, id]));
  }, []);

  const markAsRead = useCallback(
    async (id) => {
      optimisticRead(id);
      try {
        await fetch(`${base}/${school}/notification/mark-read`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ ids: [id] }),
        });
      } catch (e) {
        // rollback on failure
        setOptimistic((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }
    },
    [authHeaders, base, school, optimisticRead]
  );

  const markAllAsRead = useCallback(async () => {
    const ids = items.map((n) => n._id);
    ids.forEach((id) => optimisticRead(id));
    try {
      await fetch(`${base}/${school}/notification/mark-read`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids }),
      });
    } catch {
      // 실패시 다시 새로고침으로 동기화
      fetchNotifications();
    }
  }, [authHeaders, base, school, items, optimisticRead, fetchNotifications]);

  const refetch = fetchNotifications;

  return { items, count, refetch, optimisticRead, dismiss, markAsRead, markAllAsRead };
}





