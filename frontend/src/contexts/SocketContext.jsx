// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const Ctx = createContext({
  socket: null,
  emit: () => {},
  on: () => {},   // now returns unsubscribe() function
  off: () => {},
  connected: false,
});

export function SocketProvider({ children }) {
  const { token } = useAuth() || {};
  const [socket, setSocket] = useState(null);
  const sockRef = useRef(null);

  useEffect(() => {
    if (!token) {
      try { sockRef.current?.disconnect(); } catch {}
      sockRef.current = null;
      setSocket(null);
      return;
    }

    const s = io(import.meta.env.VITE_SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true,
    });

    s.on("connect_error", (err) => console.warn("[socket] connect_error:", err?.message));
    s.on("reconnect_attempt", (n) => console.log("[socket] reconnect_attempt:", n));
    s.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));

    sockRef.current = s;
    setSocket(s);

    return () => {
      try { s.disconnect(); } catch {}
      sockRef.current = null;
      setSocket(null);
    };
  }, [token]);

  const value = useMemo(() => ({
    socket,
    connected: !!socket?.connected,
    emit: (evt, payload) => sockRef.current?.emit?.(evt, payload),
    on: (evt, handler) => {
      const s = sockRef.current;
      s?.on?.(evt, handler);
      // ✅ unsubscribe 함수 반환 (정확한 핸들러로 off)
      return () => s?.off?.(evt, handler);
    },
    off: (evt, handler) => sockRef.current?.off?.(evt, handler),
  }), [socket]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}





