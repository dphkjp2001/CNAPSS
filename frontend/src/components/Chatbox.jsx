// ✅ src/components/ChatBox.jsx
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/ko";

dayjs.locale("ko");
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  transports: ["websocket"],
});

function ChatBox({ conversationId, userEmail, onClose, fullSize = false, otherNickname, otherEmail }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/${conversationId}/messages`);
        const data = await res.json();
        setMessages(data);

        socket.emit("markAsRead", {
          conversationId,
          email: userEmail,
        });
      } catch (err) {
        console.error("❌ 메시지 불러오기 실패:", err);
      }
    };

    fetchMessages();
  }, [conversationId, userEmail]);

  useEffect(() => {
    socket.emit("join", { conversationId });

    const handleIncoming = (msg) => {
      setMessages((prev) => [...prev, msg]);

      socket.emit("markAsRead", {
        conversationId,
        email: userEmail,
      });
    };

    const handleReadUpdate = ({ conversationId: convoId, reader }) => {
      if (convoId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.readBy?.includes(reader) ? m : { ...m, readBy: [...(m.readBy || []), reader] }
        )
      );
    };

    socket.on("receiveMessage", handleIncoming);
    socket.on("readStatusUpdated", handleReadUpdate);

    return () => {
      socket.off("receiveMessage", handleIncoming);
      socket.off("readStatusUpdated", handleReadUpdate);
    };
  }, [conversationId, userEmail]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const msg = {
      conversationId,
      sender: userEmail,
      content: trimmed,
    };

    socket.emit("sendMessage", msg);
    setInput("");
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const shouldShowDate = (msg, index) => {
    if (index === 0) return true;
    return !dayjs(msg.createdAt).isSame(messages[index - 1].createdAt, "day");
  };

  const lastMyReadMessage = [...messages].reverse().find(
    (m) => m.sender === userEmail && m.readBy?.includes(otherEmail)
  );

  return (
    <div
      className={`relative border rounded-lg shadow bg-white flex flex-col ${
        fullSize ? "w-full h-full" : "w-full max-w-md p-4"
      }`}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl"
        >
          ×
        </button>
      )}

      <div className="flex items-center gap-2 border-b p-2 font-semibold">
        <span>🗨️</span>
        <span>{otherNickname || "Chat"}</span>
      </div>

      <div className="flex-1 overflow-y-auto mb-3 space-y-2 p-4">
        {messages.map((msg, idx) => (
          <div key={idx}>
            {shouldShowDate(msg, idx) && (
              <div className="text-center text-sm text-gray-400 my-2">
                {dayjs(msg.createdAt).format("YYYY년 M월 D일")}
              </div>
            )}
            <div
              className={`flex ${
                msg.sender === userEmail ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-xs">
                <div
                  className={`px-3 py-1 rounded-lg break-words ${
                    msg.sender === userEmail
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  {msg.content}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    msg.sender === userEmail
                      ? "text-right text-gray-300"
                      : "text-left text-gray-500"
                  }`}
                >
                  {dayjs(msg.createdAt).format("A h:mm")}
                  {msg === lastMyReadMessage && (
                    <span className="ml-1 text-blue-500 font-medium">Seen</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="flex gap-2 p-2 border-t">
        <input
          type="text"
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isComposing) handleSend();
          }}
          placeholder="메시지를 입력하세요..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
        >
          전송
        </button>
      </div>
    </div>
  );
}

export default ChatBox;













