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
 *    items,            // list of notifications (FILTERED: dismissed 제외)
 *    count,            // unread count (optimistic/dismissed 반영)
 *    refetch,          // force refresh
 *    optimisticRead,   // 클릭 즉시 읽음으로 간주(배지 감소)
 *    dismiss,          // 목록에서 즉시 제거
 *    markAsRead,       // 서버에 단건 읽음 반영
 *    markAllAsRead,    // 모두 읽음(낙관 + 서버)
 *  }
 */
export default function useNotificationsPolling(
  _email /* backward-compat */,
  activeInterval = 5000,
  inactiveInterval = 60000,
  minutes = 5
) {
  const { user, token } = useAuth();
  const { school } = useSchool();

  const [itemsRaw, setItemsRaw] = useState([]);            // 서버 원본 목록
  const [optimistic, setOptimistic] = useState(() => new Set()); // 미리 읽음 처리한 id
  const [dismissed, setDismissed] = useState(() => new Set());   // UI에서 숨긴 id
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
      const list = Array.isArray(data) ? data : [];
      setItemsRaw(list);

      // 서버가 이미 읽은 항목을 빼서 내려준다면 optimistic/dismissed는 자연 보정됨.
      // 혹시 서버에서 잠깐 유지되어도 dismissed에 있으면 보이지 않음.
      setDismissed((prev) => {
        const serverIds = new Set(list.map((n) => n._id));
        // 서버에 없는 id는 굳이 유지할 필요 없음 (메모리 정리)
        const next = new Set([...prev].filter((id) => serverIds.has(id)));
        return next;
      });
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

  // ✅ 클릭 즉시 목록에서 제거
  const dismiss = useCallback((id) => {
    if (!id) return;
    setDismissed((prev) => {
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
    // 낙관적: 전부 읽음 + 전부 숨김
    setOptimistic((prev) => {
      const next = new Set(prev);
      itemsRaw.forEach((n) => next.add(n._id));
      return next;
    });
    setDismissed((prev) => {
      const next = new Set(prev);
      itemsRaw.forEach((n) => next.add(n._id));
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
  }, [base, school, user?.email, itemsRaw, minutes]);

  const refetch = fetchNotifications;

  // 화면에 보여줄 항목 = 서버 원본 - dismissed
  const items = useMemo(
    () => itemsRaw.filter((n) => !dismissed.has(n._id)),
    [itemsRaw, dismissed]
  );

  // 배지 카운트 = 보여줄 항목 중 아직 optimistic 읽음 아닌 것
  const count = useMemo(
    () => items.reduce((acc, n) => acc + (optimistic.has(n._id) ? 0 : 1), 0),
    [items, optimistic]
  );

  return { items, count, refetch, optimisticRead, dismiss, markAsRead, markAllAsRead };
}




