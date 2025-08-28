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




// 전역 소켓 컨텍스트: emit/on/off가 호출 시점에 ref를 읽도록 래핑해서
// '죽은 핸들러' 문제가 없도록 수정.
import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const Ctx = createContext({ emit: () => {}, on: () => {}, off: () => {} });

export function SocketProvider({ children }) {
  const { token } = useAuth() || {};
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
      auth: { token }, // 🔐 서버에서 JWT 인증
    });
    socketRef.current = s;
    return () => {
      try { s.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, [token]);

  const value = {
    emit: (event, payload) => socketRef.current?.emit?.(event, payload),
    on: (event, handler) => socketRef.current?.on?.(event, handler),
    off: (event, handler) => socketRef.current?.off?.(event, handler),
    socket: socketRef.current,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);


