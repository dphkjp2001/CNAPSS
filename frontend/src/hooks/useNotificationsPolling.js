// //frontend/src/hooks/useNotificationsPolling.js
// import { useEffect, useState } from "react";

// const useNotificationsPolling = (email, interval = 10000) => {
//   const [notifications, setNotifications] = useState([]);

//   useEffect(() => {
//     if (!email) return;

//     const fetchNotifications = async () => {
//       try {
//         const res = await fetch(`${import.meta.env.VITE_API_URL}/notifications/${email}`);
//         const data = await res.json();
//         setNotifications(data);
//       } catch (err) {
//         console.error("🔔 알림 불러오기 실패:", err);
//       }
//     };

//     fetchNotifications(); // 첫 실행

//     const timer = setInterval(fetchNotifications, interval);
//     return () => clearInterval(timer);
//   }, [email, interval]);

//   return notifications;
// };

// export default useNotificationsPolling;


// frontend/src/hooks/useNotificationsPolling.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * useNotificationsPolling
 * - Polls notification list (first page) and unread count
 * - Supports infinite scroll via loadMore()
 * - Exposes refresh() to manually refetch
 *
 * Backend endpoints expected:
 *  GET  /api/notification/:email?limit=20&cursor=<ISO>
 *  GET  /api/notification/:email/unread-count
 */
const useNotificationsPolling = (email, options = {}) => {
  const {
    interval = 20000, // ms
    limit = 20,
    enabled = true, // toggle polling
  } = options;

  const API_BASE = useMemo(() => import.meta.env.VITE_API_URL?.replace(/\/+$/, ""), []);
  const [items, setItems] = useState([]);         // current loaded items
  const [unread, setUnread] = useState(0);        // unread count
  const [nextCursor, setNextCursor] = useState(null); // pagination cursor
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchFirstPage = useCallback(async (signal) => {
    if (!email || !API_BASE) return { ok: false };

    const listUrl = `${API_BASE}/api/notification/${encodeURIComponent(email)}?limit=${limit}`;
    const countUrl = `${API_BASE}/api/notification/${encodeURIComponent(email)}/unread-count`;

    const [listRes, countRes] = await Promise.all([
      fetch(listUrl, { signal }),
      fetch(countUrl, { signal }),
    ]);

    if (!listRes.ok) throw new Error(`List fetch failed: ${listRes.status}`);
    if (!countRes.ok) throw new Error(`Count fetch failed: ${countRes.status}`);

    const listData = await listRes.json(); // { items, nextCursor }
    const countData = await countRes.json(); // { count }

    return {
      ok: true,
      items: Array.isArray(listData.items) ? listData.items : [],
      nextCursor: listData.nextCursor || null,
      unread: Number(countData.count || 0),
    };
  }, [API_BASE, email, limit]);

  const refresh = useCallback(async () => {
    if (!enabled || !email || !API_BASE) return;
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const result = await fetchFirstPage(ac.signal);
      if (mountedRef.current && result.ok) {
        setItems(result.items);
        setNextCursor(result.nextCursor);
        setUnread(result.unread);
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    return () => ac.abort();
  }, [API_BASE, email, enabled, fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (!email || !API_BASE || !nextCursor) return;
    setLoadingMore(true);
    setError(null);
    const ac = new AbortController();
    try {
      const url = `${API_BASE}/api/notification/${encodeURIComponent(email)}?limit=${limit}&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error(`Load more failed: ${res.status}`);
      const data = await res.json(); // { items, nextCursor }
      if (mountedRef.current) {
        setItems(prev => [...prev, ...(data.items || [])]);
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
    return () => ac.abort();
  }, [API_BASE, email, limit, nextCursor]);

  // Initial fetch + polling
  useEffect(() => {
    if (!enabled || !email || !API_BASE) return;

    let timer;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      timer = setTimeout(tick, interval);
    };

    // initial
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [API_BASE, email, enabled, interval, refresh]);

  // Optional: react to real-time socket event to bump unread count immediately
  useEffect(() => {
    const handler = () => {
      setUnread(prev => (typeof prev === "number" ? prev + 1 : 1));
    };
    window.addEventListener("notification:new", handler);
    return () => window.removeEventListener("notification:new", handler);
  }, []);

  return {
    items,         // array of notifications (comments)
    unread,        // number
    nextCursor,    // string|null
    loading,       // boolean
    loadingMore,   // boolean
    error,         // Error|null
    refresh,       // function
    loadMore,      // function
  };
};

export default useNotificationsPolling;
