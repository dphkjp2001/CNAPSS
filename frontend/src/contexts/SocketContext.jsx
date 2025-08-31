// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const Ctx = createContext({
  socket: null,
  emit: () => {},
  on: () => {},
  off: () => {},
  connected: false,
});

export function SocketProvider({ children }) {
  const { token } = useAuth() || {};
  const [socket, setSocket] = useState(null);          // ← 상태로 들고와서 rerender 유도
  const sockRef = useRef(null);

  useEffect(() => {
    // 토큰 없으면 연결하지 않음
    if (!token) {
      // 기존 소켓이 있다면 정리
      try { sockRef.current?.disconnect(); } catch {}
      sockRef.current = null;
      setSocket(null);
      return;
    }

    // 안정성 옵션 강화
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"], // websocket 우선, 실패시 polling fallback
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,              // 연결 타임아웃
      autoConnect: true,
    });

    // 디버깅 핸들러(필요시 콘솔 확인)
    s.on("connect_error", (err) => {
      // eslint-disable-next-line no-console
      console.warn("[socket] connect_error:", err?.message);
    });
    s.on("reconnect_attempt", (n) => {
      // eslint-disable-next-line no-console
      console.log("[socket] reconnect_attempt:", n);
    });
    s.on("disconnect", (reason) => {
      // eslint-disable-next-line no-console
      console.log("[socket] disconnected:", reason);
    });

    sockRef.current = s;
    setSocket(s);

    return () => {
      try { s.disconnect(); } catch {}
      sockRef.current = null;
      setSocket(null);
    };
  }, [token]);

  // 최신 ref를 사용해서 stale 방지
  const value = useMemo(() => ({
    socket,
    connected: !!socket?.connected,
    emit: (evt, payload) => sockRef.current?.emit?.(evt, payload),
    on: (evt, handler) => sockRef.current?.on?.(evt, handler),
    off: (evt, handler) => sockRef.current?.off?.(evt, handler),
  }), [socket]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}




