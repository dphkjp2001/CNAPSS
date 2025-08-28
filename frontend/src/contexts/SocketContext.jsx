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




import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

/** 최신 소켓 ref를 래핑해서 on/emit/off가 stale 되지 않도록 보장 */
const Ctx = createContext({
  socket: null,
  emit: () => {},
  on: () => {},
  off: () => {},
});

export function SocketProvider({ children }) {
  const { token } = useAuth() || {};
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
      auth: { token }, // 🔐 서버에서 JWT 검증
    });
    socketRef.current = s;

    return () => {
      try { s.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, [token]);

  const value = {
    socket: socketRef.current,
    emit: (event, payload) => socketRef.current?.emit?.(event, payload),
    on: (event, handler) => socketRef.current?.on?.(event, handler),
    off: (event, handler) => socketRef.current?.off?.(event, handler),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}



