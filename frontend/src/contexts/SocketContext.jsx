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

// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext"; // assumes you expose { user } with _id and email

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  // Create socket once
  useEffect(() => {
    const URL = (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/\/+$/, "");
    const s = io(URL, {
      transports: ["websocket"], // prefer WS
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(s);

    // Basic logging + global handlers
    const onConnect = () => {
      // re-join auth room on reconnect if user exists
      if (user?._id || user?.email) {
        s.emit("auth:join", { userId: user?._id, email: user?.email });
      }
    };

    const onConnectError = (err) => {
      // eslint-disable-next-line no-console
      console.warn("🔌 socket connect_error:", err?.message || err);
    };

    const onDisconnect = (reason) => {
      // eslint-disable-next-line no-console
      console.log("🔌 socket disconnected:", reason);
    };

    // Relay server events to window-level CustomEvents so any part of the app can listen
    const onNotificationNew = (payload) => {
      window.dispatchEvent(new CustomEvent("notification:new", { detail: payload }));
    };
    const onInboxNewMessage = (payload) => {
      window.dispatchEvent(new CustomEvent("inbox:newMessage", { detail: payload }));
    };
    const onConversationUpdated = (payload) => {
      window.dispatchEvent(new CustomEvent("conversation:updated", { detail: payload }));
    };

    s.on("connect", onConnect);
    s.on("connect_error", onConnectError);
    s.on("disconnect", onDisconnect);

    // These should match emits from your server
    s.on("notification:new", onNotificationNew);
    s.on("inbox:newMessage", onInboxNewMessage);
    s.on("conversationUpdated", onConversationUpdated);

    return () => {
      s.off("connect", onConnect);
      s.off("connect_error", onConnectError);
      s.off("disconnect", onDisconnect);

      s.off("notification:new", onNotificationNew);
      s.off("inbox:newMessage", onInboxNewMessage);
      s.off("conversationUpdated", onConversationUpdated);

      s.disconnect();
      setSocket(null);
    };
    // Only create/destroy socket once on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join user-specific rooms whenever the user becomes available/changes
  useEffect(() => {
    if (!socket) return;
    if (user?._id || user?.email) {
      socket.emit("auth:join", { userId: user?._id, email: user?.email });
    }
  }, [socket, user?._id, user?.email]);

  // Provide a stable reference
  const value = useMemo(() => socket, [socket]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

