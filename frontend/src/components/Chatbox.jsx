import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/ko";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { useSocket } from "../contexts/SocketContext";
import * as chatApi from "../api/chat";

dayjs.locale("ko");
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

/**
 * props:
 *  - conversationId (required)
 *  - userEmail (optional fallback)
 *  - otherNickname / otherEmail (UI only)
 *  - onClose? / fullSize?
 */
export default function ChatBox({
  conversationId,
  userEmail,
  onClose,
  fullSize = false,
  otherNickname,
  otherEmail,
}) {
  const { user, token } = useAuth() || {};
  const { school } = useSchool() || {};
  const { socket, emit, on, off } = useSocket();

  const me = (user?.email || userEmail || "").toLowerCase();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // 1) 초기 로드 + 읽음 처리
  useEffect(() => {
    if (!conversationId || !token || !school) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await chatApi.getMessages({ school, token, conversationId });
        if (!alive) return;
        setMessages((Array.isArray(data) ? data : []).reverse());
        emit?.("chat:read", { conversationId });
        try { await chatApi.markRead({ school, token, conversationId }); } catch {}
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [conversationId, token, school, emit]);

  // 2) 실시간 수신/읽음 갱신 (중복 방지: _id de-dupe)
  useEffect(() => {
    if (!conversationId || !socket) return;

    emit?.("chat:join", { conversationId });

    const handleReceive = (msg) => {
      if (String(msg.conversationId) !== String(conversationId)) return;
      setMessages((prev) => {
        const exists = prev.some((m) => m._id && msg._id && String(m._id) === String(msg._id));
        return exists ? prev : [...prev, msg];
      });
      emit?.("chat:read", { conversationId });
    };

    const handleReadUpdate = ({ conversationId: cid, reader }) => {
      if (String(cid) !== String(conversationId)) return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.readBy || []).includes(reader) ? m : { ...m, readBy: [...(m.readBy || []), reader] }
        )
      );
    };

    // ✅ on()이 unsubscribe 함수를 반환하게 바뀌므로 여기서 그대로 사용 가능
    const un1 = on?.("chat:receive", handleReceive);
    const un2 = on?.("chat:read:updated", handleReadUpdate);
    return () => {
      typeof un1 === "function" && un1();
      typeof un2 === "function" && un2();
    };
  }, [socket, emit, on, conversationId]);

  // 3) 전송 (REST만 호출; 서버가 chat:receive 브로드캐스트)
  const handleSend = async () => {
    const content = input.trim();
    if (!content || !conversationId) return;
    try {
      const saved = await chatApi.sendMessage({ school, token, conversationId, content });
      // 🔒 낙관 추가도 중복 방지(서버 수신이 먼저 도착한 경우 대비)
      setMessages((prev) => {
        const exists = saved?._id && prev.some((m) => String(m._id) === String(saved._id));
        return exists ? prev : [...prev, saved];
      });
    } catch (e) {
      console.error("send failed", e);
      alert("메시지 전송 실패");
    } finally {
      setInput("");
    }
  };

  // 4) 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const showDateDivider = (msg, idx) =>
    idx === 0 || !dayjs(msg.createdAt).isSame(messages[idx - 1]?.createdAt, "day");

  const lastMyReadMessage = [...messages].reverse().find(
    (m) =>
      (m.sender || "").toLowerCase() === me &&
      (m.readBy || []).map((e) => e.toLowerCase()).includes((otherEmail || "").toLowerCase())
  );

  return (
    <div className={`relative border rounded-lg shadow bg-white flex flex-col ${fullSize ? "w-full h-full" : "w-[360px]"}`}>
      {onClose && (
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl">×</button>
      )}

      <div className="flex items-center gap-2 border-b p-2 font-semibold">
        <span>🗨️</span>
        <span>{otherNickname || "Chat"}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {messages.map((msg, idx) => (
          <div key={msg._id || idx}>
            {showDateDivider(msg, idx) && (
              <div className="text-center text-xs text-gray-400 my-2">
                {dayjs(msg.createdAt).format("YYYY년 M월 D일")}
              </div>
            )}
            <div className={`flex ${(msg.sender || "").toLowerCase() === me ? "justify-end" : "justify-start"}`}>
              <div className="max-w-xs">
                <div className={`px-3 py-1 rounded-lg break-words ${ (msg.sender || "").toLowerCase() === me ? "bg-blue-600 text-white" : "bg-gray-200 text-black" }`}>
                  {msg.content}
                </div>
                <div className={`text-[11px] mt-1 ${ (msg.sender || "").toLowerCase() === me ? "text-right text-gray-400" : "text-left text-gray-500" }`}>
                  {dayjs(msg.createdAt).format("A h:mm")}
                  {msg === lastMyReadMessage && <span className="ml-1 text-blue-500 font-medium">Seen</span>}
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
          onKeyDown={(e) => { if (e.key === "Enter" && !isComposing) handleSend(); }}
          placeholder="메시지를 입력하세요..."
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

















