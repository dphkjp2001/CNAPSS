// // frontend/src/components/Chatbox.jsx
// import React, { useEffect, useRef, useState } from "react";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import localizedFormat from "dayjs/plugin/localizedFormat";
// import "dayjs/locale/ko";
// import { useAuth } from "../contexts/AuthContext";
// import { useSchool } from "../contexts/SchoolContext";
// import { useSocket } from "../contexts/SocketContext";
// import * as chatApi from "../api/chat";

// dayjs.locale("ko");
// dayjs.extend(relativeTime);
// dayjs.extend(localizedFormat);

// /**
//  * 플로팅/풀사이즈 공용 채팅 박스
//  * props:
//  *  - conversationId (필수)
//  *  - userEmail (옵션, fallback)
//  *  - otherNickname / otherEmail (옵션, 표시/Seen용)
//  *  - onClose (옵션, 플로팅 X 버튼)
//  *  - fullSize (기본 false; /messages에서 true로 사용)
//  */
// export default function ChatBox({
//   conversationId,
//   userEmail,
//   onClose,
//   fullSize = false,
//   otherNickname,
//   otherEmail,
// }) {
//   const { user, token } = useAuth() || {};
//   const { school } = useSchool() || {};
//   const { socket, emit, on, off } = useSocket();

//   const me = (user?.email || userEmail || "").toLowerCase();
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [isComposing, setIsComposing] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const scrollRef = useRef(null);

//   // 1) 최초 로드: 메시지 불러오기 + 읽음 처리
//   useEffect(() => {
//     if (!conversationId || !token || !school) return;
//     let alive = true;
//     (async () => {
//       try {
//         setLoading(true);
//         const data = await chatApi.getMessages({ school, token, conversationId });
//         if (!alive) return;
//         // API는 최신순 → UI는 오래된→최신 순서로 보여주기 위해 reverse
//         setMessages((Array.isArray(data) ? data : []).reverse());
//         emit?.("chat:read", { conversationId });
//         try { await chatApi.markRead({ school, token, conversationId }); } catch {}
//       } finally {
//         if (alive) setLoading(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, [conversationId, token, school, emit]);

//   // 2) 룸 조인 + 실시간 수신/읽음 갱신 (중복 방지: _id de-dupe)
//   useEffect(() => {
//     if (!conversationId || !socket) return;

//     emit?.("chat:join", { conversationId });

//     const handleReceive = (msg) => {
//       if (msg.conversationId !== conversationId) return;
//       setMessages((prev) => {
//         // 이미 같은 _id가 있으면 무시 (리로드 전/후, 낙관추가 vs 서버수신 중복 방지)
//         const exists = prev.some((m) => m._id && msg._id && String(m._id) === String(msg._id));
//         if (exists) return prev;
//         const next = [...prev, msg];
//         return next;
//       });
//       emit?.("chat:read", { conversationId });
//     };

//     const handleReadUpdate = ({ conversationId: cid, reader }) => {
//       if (cid !== conversationId) return;
//       setMessages((prev) =>
//         prev.map((m) => (m.readBy?.includes(reader) ? m : { ...m, readBy: [...(m.readBy || []), reader] }))
//       );
//     };

//     on?.("chat:receive", handleReceive);
//     on?.("chat:read:updated", handleReadUpdate);
//     return () => {
//       off?.("chat:receive", handleReceive);
//       off?.("chat:read:updated", handleReadUpdate);
//     };
//   }, [socket, emit, on, off, conversationId]);

//   // 3) 전송 — REST만 사용 (소켓 chat:send emit 제거)
//   const handleSend = async () => {
//     const content = input.trim();
//     if (!content || !conversationId) return;
//     try {
//       // 서버 REST가 저장 + 서버가 chat:receive를 브로드캐스트함(백엔드 라우트 참고)
//       const saved = await chatApi.sendMessage({ school, token, conversationId, content });
//       // 낙관적 추가: 서버가 다시 보내줄 때 _id가 같으므로 handleReceive에서 de-dupe됨
//       setMessages((prev) => [...prev, saved]);
//     } catch (e) {
//       console.error("send failed", e);
//       alert("메시지 전송 실패");
//     } finally {
//       setInput("");
//     }
//   };

//   // 4) 자동 스크롤
//   useEffect(() => {
//     scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
//   }, [messages]);

//   const showDateDivider = (msg, idx) =>
//     idx === 0 || !dayjs(msg.createdAt).isSame(messages[idx - 1]?.createdAt, "day");

//   const lastMyReadMessage = [...messages].reverse().find(
//     (m) =>
//       (m.sender || "").toLowerCase() === me &&
//       (m.readBy || []).map((e) => e.toLowerCase()).includes((otherEmail || "").toLowerCase())
//   );

//   return (
//     <div className={`relative border rounded-lg shadow bg-white flex flex-col ${fullSize ? "w-full h-full" : "w-[360px]"}`}>
//       {onClose && (
//         <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl">×</button>
//       )}

//       <div className="flex items-center gap-2 border-b p-2 font-semibold">
//         <span>🗨️</span>
//         <span>{otherNickname || "Chat"}</span>
//       </div>

//       <div className="flex-1 overflow-y-auto p-3 space-y-2">
//         {loading && <div className="text-sm text-gray-500">Loading...</div>}
//         {messages.map((msg, idx) => (
//           <div key={msg._id || idx}>
//             {showDateDivider(msg, idx) && (
//               <div className="text-center text-xs text-gray-400 my-2">
//                 {dayjs(msg.createdAt).format("YYYY년 M월 D일")}
//               </div>
//             )}
//             <div className={`flex ${(msg.sender || "").toLowerCase() === me ? "justify-end" : "justify-start"}`}>
//               <div className="max-w-xs">
//                 <div className={`px-3 py-1 rounded-lg break-words ${ (msg.sender || "").toLowerCase() === me ? "bg-blue-600 text-white" : "bg-gray-200 text-black" }`}>
//                   {msg.content}
//                 </div>
//                 <div className={`text-[11px] mt-1 ${ (msg.sender || "").toLowerCase() === me ? "text-right text-gray-400" : "text-left text-gray-500" }`}>
//                   {dayjs(msg.createdAt).format("A h:mm")}
//                   {msg === lastMyReadMessage && <span className="ml-1 text-blue-500 font-medium">Seen</span>}
//                 </div>
//               </div>
//             </div>
//           </div>
//         ))}
//         <div ref={scrollRef} />
//       </div>

//       <div className="flex gap-2 p-2 border-t">
//         <input
//           type="text"
//           className="flex-1 border rounded p-2"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onCompositionStart={() => setIsComposing(true)}
//           onCompositionEnd={() => setIsComposing(false)}
//           onKeyDown={(e) => { if (e.key === "Enter" && !isComposing) handleSend(); }}
//           placeholder="메시지를 입력하세요..."
//         />
//         <button
//           onClick={handleSend}
//           disabled={!socket}
//           className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }

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

  // 2) 실시간 수신/읽음 갱신
  useEffect(() => {
    if (!conversationId || !socket) return;

    emit?.("chat:join", { conversationId });

    const handleReceive = (msg) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        const exists = prev.some((m) => m._id && msg._id && String(m._id) === String(msg._id));
        if (exists) return prev;
        return [...prev, msg];
      });
      emit?.("chat:read", { conversationId });
    };

    const handleReadUpdate = ({ conversationId: cid, reader }) => {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.readBy?.includes(reader) ? m : { ...m, readBy: [...(m.readBy || []), reader] }))
      );
    };

    on?.("chat:receive", handleReceive);
    on?.("chat:read:updated", handleReadUpdate);
    return () => {
      off?.("chat:receive", handleReceive);
      off?.("chat:read:updated", handleReadUpdate);
    };
  }, [socket, emit, on, off, conversationId]);

  // 3) 전송 (REST만 호출, 소켓 브로드캐스트는 서버가 함)
  const handleSend = async () => {
    const content = input.trim();
    if (!content || !conversationId) return;
    try {
      const saved = await chatApi.sendMessage({ school, token, conversationId, content });
      setMessages((prev) => [...prev, saved]); // 낙관 추가 (중복은 위에서 de-dupe)
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
















