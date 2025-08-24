// // // ✅ src/pages/message/Messages.jsx
// // import React, { useEffect, useState } from "react";
// // import ChatBox from "../../components/ChatBox";
// // import { useAuth } from "../../contexts/AuthContext";
// // import { io } from "socket.io-client";

// // const socket = io(import.meta.env.VITE_SOCKET_URL, {
// //   transports: ["websocket"],
// // });

// // function Messages() {
// //   const { user } = useAuth();
// //   const [conversations, setConversations] = useState([]);
// //   const [selected, setSelected] = useState(null);

// //   const fetchConversations = async () => {
// //     if (!user?.email) return;
// //     try {
// //       const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversations/${user.email}`);
// //       if (!res.ok) throw new Error("응답 실패");
// //       const data = await res.json();
// //       if (!Array.isArray(data)) throw new Error("잘못된 데이터 형식");
// //       setConversations(data);
// //     } catch (err) {
// //       console.error("❌ 대화 불러오기 실패:", err.message);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchConversations();
// //   }, [user]);

// //   // ✅ 메시지 수신시 목록 실시간 갱신
// //   useEffect(() => {
// //     const handleReceive = () => fetchConversations();
// //     socket.on("receiveMessage", handleReceive);
// //     return () => socket.off("receiveMessage", handleReceive);
// //   }, []);

// //   const otherNickname = (convo) => {
// //     return convo.buyer === user.email ? convo.sellerNickname : convo.buyerNickname;
// //   };

// //   return (
// //     <div className="flex h-[calc(100vh-80px)]">
// //       {/* 왼쪽 목록 */}
// //       <div className="w-80 border-r p-4">
// //         <h2 className="text-lg font-bold mb-4">💬 Messages</h2>
// //         <div className="space-y-2">
// //           {conversations.length === 0 && <p className="text-sm text-gray-500">진행 중인 채팅이 없습니다.</p>}
// //           {conversations.map((c) => (
// //             <div
// //               key={c._id}
// //               onClick={() => setSelected(c)}
// //               className={`cursor-pointer p-3 rounded-lg ${
// //                 selected?._id === c._id ? "bg-blue-100" : "hover:bg-gray-100"
// //               }`}
// //             >
// //               <p className="font-medium">{otherNickname(c)}</p>
// //               <p className="text-sm text-gray-500 truncate">{c.lastMessage || "(메시지 없음)"}</p>
// //             </div>
// //           ))}
// //         </div>
// //       </div>

// //       {/* 오른쪽 채팅창 */}
// //       <div className="flex-1 p-4">
// //         {selected ? (
// //           <ChatBox
// //             conversationId={selected._id}
// //             userEmail={user.email}
// //             fullSize
// //             otherNickname={otherNickname(selected)}
// //           />
// //         ) : (
// //           <div className="text-center text-gray-400 mt-20">
// //             🧭 왼쪽에서 채팅을 선택하세요.
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // }

// // export default Messages;


// // ✅ src/pages/message/Messages.jsx
// import React, { useEffect, useState } from "react";
// import ChatBox from "../../components/ChatBox";
// import { useAuth } from "../../contexts/AuthContext";
// import { io } from "socket.io-client";

// const socket = io(import.meta.env.VITE_SOCKET_URL, {
//   transports: ["websocket"],
// });

// function Messages() {
//   const { user } = useAuth();
//   const [conversations, setConversations] = useState([]);
//   const [selected, setSelected] = useState(null);

//   const fetchConversations = async () => {
//     if (!user?.email) return;
//     try {
//       const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversations/${user.email}`);
//       if (!res.ok) throw new Error("응답 실패");
//       const data = await res.json();
//       if (!Array.isArray(data)) throw new Error("잘못된 데이터 형식");
//       setConversations(data);
//     } catch (err) {
//       console.error("❌ 대화 불러오기 실패:", err.message);
//     }
//   };

//   useEffect(() => {
//     fetchConversations();
//   }, [user]);

//   // ✅ 메시지 수신시 목록 실시간 갱신
//   useEffect(() => {
//     const handleReceive = () => fetchConversations();
//     const handleUpdate = ({ conversationId, lastMessage, updatedAt }) => {
//       setConversations((prev) =>
//         prev.map((c) =>
//           c._id === conversationId ? { ...c, lastMessage, updatedAt } : c
//         )
//       );
//     };

//     socket.on("receiveMessage", handleReceive);
//     socket.on("conversationUpdated", handleUpdate);

//     return () => {
//       socket.off("receiveMessage", handleReceive);
//       socket.off("conversationUpdated", handleUpdate);
//     };
//   }, []);

//   const otherNickname = (convo) => {
//     return convo.buyer === user.email ? convo.sellerNickname : convo.buyerNickname;
//   };

//   return (
//     <div className="flex h-[calc(100vh-80px)]">
//       {/* 왼쪽 목록 */}
//       <div className="w-80 border-r p-4">
//         <h2 className="text-lg font-bold mb-4">💬 Messages</h2>
//         <div className="space-y-2">
//           {conversations.length === 0 && <p className="text-sm text-gray-500">진행 중인 채팅이 없습니다.</p>}
//           {conversations.map((c) => (
//             <div
//               key={c._id}
//               onClick={() => setSelected(c)}
//               className={`cursor-pointer p-3 rounded-lg ${
//                 selected?._id === c._id ? "bg-blue-100" : "hover:bg-gray-100"
//               }`}
//             >
//               <p className="font-medium">{otherNickname(c)}</p>
//               <p className="text-sm text-gray-500 truncate">{c.lastMessage || "(메시지 없음)"}</p>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* 오른쪽 채팅창 */}
//       <div className="flex-1 p-4">
//         {selected ? (
//           <ChatBox
//             conversationId={selected._id}
//             userEmail={user.email}
//             fullSize
//             otherNickname={otherNickname(selected)}
//           />
//         ) : (
//           <div className="text-center text-gray-400 mt-20">
//             🧭 왼쪽에서 채팅을 선택하세요.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Messages;






// src/pages/messages/Messages.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatBox from "../../components/Chatbox";
import { useAuth } from "../../contexts/AuthContext";
import { io } from "socket.io-client";

// ✅ 우리 API 래퍼 사용 (이미 올려준 파일과 함수명 맞춤)
import { getConversations } from "../../api/chat";

export default function Messages() {
  const { user, token } = useAuth();
  const { school: schoolParam } = useParams();            // route: /:school/messages
  const [searchParams] = useSearchParams();               // ?conversation=<id>
  const school = useMemo(
    () => String(schoolParam || localStorage.getItem("selectedSchool") || "").toLowerCase(),
    [schoolParam]
  );

  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);

  /* ---------------- Socket: auth + school 분리 ---------------- */
  const socketRef = useRef(null);
  useEffect(() => {
    if (!token || !school) return;
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },          // 🔐 서버에서 JWT 검증
      query: { school },        // 🏫 테넌트 분리
    });
    socketRef.current = s;

    const handleReceive = () => refresh(); // 새 메시지 오면 목록 갱신
    const handleUpdate = ({ conversationId, lastMessage, updatedAt }) => {
      setConvos((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, lastMessage, updatedAt } : c))
      );
    };

    s.on("receiveMessage", handleReceive);
    s.on("conversationUpdated", handleUpdate);

    return () => {
      s.off("receiveMessage", handleReceive);
      s.off("conversationUpdated", handleUpdate);
      s.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, school]);

  /* ---------------- Conversations 불러오기 ---------------- */
  const refresh = useCallback(async () => {
    if (!token || !school) return;
    try {
      const data = await getConversations({ school, token }); // ✅ /:school/chat/conversations
      setConvos(Array.isArray(data) ? data : []);

      // URL ?conversation=<id>가 있으면 해당 대화 자동 선택
      const paramId = searchParams.get("conversation");
      if (paramId) {
        const found = data.find((c) => c._id === paramId);
        if (found) setSelected(found);
      } else if (!selected && data.length > 0) {
        setSelected(data[0]);
      }
    } catch (e) {
      console.error("getConversations failed", e);
      setConvos([]);
    }
  }, [token, school, searchParams, selected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---------------- 표시용 헬퍼 ---------------- */
  const myEmail = (user?.email || "").toLowerCase();

  const otherNickname = (convo) =>
    (convo?.buyer || "").toLowerCase() === myEmail ? convo?.sellerNickname : convo?.buyerNickname;

  const otherEmail = (convo) =>
    (convo?.buyer || "").toLowerCase() === myEmail ? convo?.seller : convo?.buyer;

  const unreadCount = (convo) =>
    convo?.messages?.filter(
      (m) => (m.sender || "").toLowerCase() !== myEmail && !(m.readBy || []).includes(myEmail)
    ).length || 0;

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 왼쪽: 대화 목록 */}
      <div className="w-80 border-r p-4">
        <h2 className="mb-4 text-lg font-bold">💬 Messages</h2>

        <div className="space-y-2">
          {convos.length === 0 && (
            <p className="text-sm text-gray-500">진행 중인 채팅이 없습니다.</p>
          )}

          {convos.map((c) => (
            <div
              key={c._id}
              onClick={() => setSelected(c)}
              className={`relative cursor-pointer rounded-lg p-3 ${
                selected?._id === c._id ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <p className="font-medium">{otherNickname(c) || "Unknown"}</p>
              <p className="truncate text-sm text-gray-500">
                {c.lastMessage || "(메시지 없음)"}
              </p>

              {unreadCount(c) > 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                  {unreadCount(c)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽: 채팅창 */}
      <div className="flex-1 p-4">
        {selected ? (
          <ChatBox
            conversationId={selected._id}
            userEmail={user.email}
            otherEmail={otherEmail(selected)}     // 읽음표시/헤더용
            otherNickname={otherNickname(selected)}
            school={school}                        // 🔑 필요하면 ChatBox에서 사용
            fullSize
          />
        ) : (
          <div className="mt-20 text-center text-gray-400">🧭 왼쪽에서 채팅을 선택하세요.</div>
        )}
      </div>
    </div>
  );
}

