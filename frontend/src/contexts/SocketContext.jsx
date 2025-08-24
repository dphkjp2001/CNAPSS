// // src/contexts/SocketContext.jsx
// import React, { createContext, useContext, useEffect, useRef } from "react";
// import { io } from "socket.io-client";

// const SocketContext = createContext();

// export const useSocket = () => useContext(SocketContext);

// export function SocketProvider({ children }) {
//   const socketRef = useRef(null);

//   useEffect(() => {
//     const socket = io(import.meta.env.VITE_SOCKET_URL, {
//       transports: ["websocket"],
//     });
//     socketRef.current = socket;

//     return () => {
//       socket.disconnect();
//     };
//   }, []);

//   return (
//     <SocketContext.Provider value={socketRef.current}>
//       {children}
//     </SocketContext.Provider>
//   );
// }


// frontend/src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const Ctx = createContext({ socket: null, emit: () => {}, on: () => {}, off: () => {} });

export function SocketProvider({ children }) {
  const { token } = useAuth() || {};
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return; // not logged in
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
      auth: { token }, // 🔐 서버에서 JWT 인증
    });
    socketRef.current = s;

    return () => {
      try { s.disconnect(); } catch (_) {}
      socketRef.current = null;
    };
  }, [token]);

  const api = useMemo(() => {
    const s = socketRef.current;
    return {
      socket: s,
      emit: (event, payload) => s && s.emit(event, payload),
      on: (event, handler) => s && s.on(event, handler),
      off: (event, handler) => s && s.off(event, handler),
    };
  }, [socketRef.current]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}
