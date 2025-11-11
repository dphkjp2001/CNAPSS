// // frontend/src/pages/messages/Messages.jsx
// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { useParams, useSearchParams } from "react-router-dom";
// import ChatBox from "../../components/Chatbox";
// import { useAuth } from "../../contexts/AuthContext";
// import { useSocket } from "../../contexts/SocketContext";
// import * as chatApi from "../../api/chat";

// /**
//  * Seeking 3가지 분리 표시:
//  * - course_materials = 📝 Course Materials
//  * - study_mate       = 👥 Study Buddy
//  * - coffee_chat      = ☕ Coffee Chat
//  * 그 외는 💬 DM
//  *
//  * 탭:
//  * - All
//  * - Materials / Study Buddy / Coffee Chat (각각 looking_for + kind로 필터)
//  */
// export default function Messages() {
//   const { user, token } = useAuth() || {};
//   const { school: schoolParam } = useParams();
//   const [sp, setSp] = useSearchParams();
//   const { on: onSocket } = useSocket() || {};

//   const [list, setList] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selected, setSelected] = useState(null);

//   // 'all' | 'lf_course_materials' | 'lf_study_mate' | 'lf_coffee_chat'
//   const [filter, setFilter] = useState("all");

//   const school = (schoolParam || "").toLowerCase();
//   const myEmail = useMemo(() => (user?.email || "").toLowerCase(), [user]);

//   const fetchConversations = useCallback(async () => {
//     if (!token || !school) return;
//     setLoading(true);
//     try {
//       const rows = await chatApi.getConversations({ school, token });
//       const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];
//       setList(arr);
//       return arr;
//     } finally {
//       setLoading(false);
//     }
//   }, [school, token]);

//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       const arr = await fetchConversations();
//       if (!alive) return;

//       const qId = sp.get("conversation");
//       if (qId && Array.isArray(arr)) {
//         const found = arr.find((c) => String(c._id) === String(qId));
//         if (found) {
//           setSelected(found);
//           setFilter(autoFilter(found));
//         }
//       }
//     })();

//     const un = onSocket?.("chat:preview", () => {
//       fetchConversations();
//     });

//     return () => {
//       alive = false;
//       if (typeof un === "function") un();
//     };
//   }, [fetchConversations, onSocket, sp]);

//   // helpers
//   const normKind = (k) => String(k || "").toLowerCase().replace(/[\s-]+/g, "_");
//   const isLF = (c) => String(c?.source).toLowerCase() === "looking_for";
//   const otherEmail = (c) => {
//     const b = String(c?.buyer || "").toLowerCase();
//     const s = String(c?.seller || "").toLowerCase();
//     return b === myEmail ? s : b;
//   };
//   const displayNameFromEmail = (email) => (email ? String(email).split("@")[0] : "Unknown");
//   const titleOf = (c) => (c?.resourceTitle && c.resourceTitle.trim()) || displayNameFromEmail(otherEmail(c));

//   const badgeText = (c) => {
//     if (!isLF(c)) return "💬 DM";
//     const k = normKind(c?.seekingKind);
//     if (k === "course_materials") return "📝 Materials";
//     if (k === "study_mate") return "👥 Study Buddy";
//     if (k === "coffee_chat") return "☕ Coffee Chat";
//     return "🎓 Seeking";
//   };

//   const autoFilter = (c) => {
//     if (!isLF(c)) return "all";
//     const k = normKind(c?.seekingKind);
//     if (k === "course_materials") return "lf_course_materials";
//     if (k === "study_mate") return "lf_study_mate";
//     if (k === "coffee_chat") return "lf_coffee_chat";
//     return "all";
//   };

//   const filtered = useMemo(() => {
//     if (filter === "all") return list;
//     const want = filter.replace(/^lf_/, ""); // course_materials | study_mate | coffee_chat
//     return list.filter((c) => isLF(c) && normKind(c?.seekingKind) === want);
//   }, [list, filter]);

//   // URL 동기화
//   useEffect(() => {
//     const id = selected?._id ? String(selected._id) : null;
//     const next = new URLSearchParams(sp.toString());
//     if (id) next.set("conversation", id);
//     else next.delete("conversation");
//     setSp(next, { replace: true });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selected]);

//   return (
//     <div className="mx-auto flex h-[calc(100vh-120px)] max-w-6xl gap-4 p-4">
//       {/* 좌측 리스트 */}
//       <div className="flex w-[340px] shrink-0 flex-col rounded-2xl border bg-white">
//         <div className="flex flex-wrap gap-2 p-3">
//           <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
//           <Chip active={filter === "lf_course_materials"} onClick={() => setFilter("lf_course_materials")}>Materials</Chip>
//           <Chip active={filter === "lf_study_mate"} onClick={() => setFilter("lf_study_mate")}>Study Buddy</Chip>
//           <Chip active={filter === "lf_coffee_chat"} onClick={() => setFilter("lf_coffee_chat")}>Coffee Chat</Chip>
//         </div>

//         <div className="min-h-0 grow overflow-y-auto">
//           {loading ? (
//             <div className="p-3 text-sm text-gray-500">Loading…</div>
//           ) : !filtered?.length ? (
//             <div className="p-3 text-sm text-gray-500">No conversations.</div>
//           ) : (
//             <ul className="divide-y">
//               {filtered.map((c) => {
//                 const isSel = selected?._id === c._id;
//                 return (
//                   <li key={c._id}>
//                     <button
//                       onClick={() => {
//                         setSelected(c);
//                         setFilter(autoFilter(c));
//                       }}
//                       className={
//                         "flex w-full items-center justify-between gap-2 px-3 py-3 text-left hover:bg-gray-50 " +
//                         (isSel ? "bg-violet-50" : "")
//                       }
//                     >
//                       <div className="min-w-0">
//                         <div className="flex items-center gap-2">
//                           <span className="whitespace-nowrap rounded-full bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-white">
//                             {badgeText(c)}
//                           </span>
//                           <span className="truncate text-sm font-semibold text-gray-900">{titleOf(c)}</span>
//                         </div>
//                         {c.lastMessage ? (
//                           <div className="truncate text-xs text-gray-500">{c.lastMessage}</div>
//                         ) : null}
//                       </div>
//                     </button>
//                   </li>
//                 );
//               })}
//             </ul>
//           )}
//         </div>
//       </div>

//       {/* 우측 채팅창 */}
//       <div className="min-w-0 grow rounded-2xl border bg-white">
//         {selected ? (
//           <ChatBox
//             conversationId={selected._id}
//             userEmail={user?.email}
//             otherEmail={otherEmail(selected)}
//             otherNickname={titleOf(selected)}
//             fullSize
//           />
//         ) : (
//           <div className="mt-20 text-center text-gray-400">🧭 왼쪽에서 채팅을 선택하세요.</div>
//         )}
//       </div>
//     </div>
//   );
// }

// function Chip({ active, children, onClick }) {
//   return (
//     <button
//       onClick={onClick}
//       className={
//         "rounded-full px-3 py-1 text-xs font-semibold " +
//         (active ? "bg-violet-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
//       }
//     >
//       {children}
//     </button>
//   );
// }



import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatBox from "../../components/Chatbox";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import * as chatApi from "../../api/chat";
import { MessageSquare } from "lucide-react";

/* ===== Design tokens ===== */
const TOKENS = {
  pageBg: "#F8F9FA",
  text: "#1F2937",
  sub: "#6B7280",
  primary: "#111827",
  accent: "#FF7A70",
  accentHover: "#FF6B61",
};

/**
 * Seeking 3가지 분리 표시:
 * - course_materials = 📝 Course Materials
 * - study_mate       = 👥 Study Buddy
 * - coffee_chat      = ☕ Coffee Chat
 * 그 외는 💬 DM
 *
 * 탭:
 * - All
 * - Materials / Study Buddy / Coffee Chat (각각 looking_for + kind로 필터)
 */
export default function Messages() {
  const { user, token } = useAuth() || {};
  const { school: schoolParam } = useParams();
  const [sp, setSp] = useSearchParams();
  const { on: onSocket } = useSocket() || {};

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // 'all' | 'lf_course_materials' | 'lf_study_mate' | 'lf_coffee_chat'
  const [filter, setFilter] = useState("all");

  const school = (schoolParam || "").toLowerCase();
  const myEmail = useMemo(() => (user?.email || "").toLowerCase(), [user]);

  const fetchConversations = useCallback(async () => {
    if (!token || !school) return;
    setLoading(true);
    try {
      const rows = await chatApi.getConversations({ school, token });
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];
      setList(arr);
      return arr;
    } finally {
      setLoading(false);
    }
  }, [school, token]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const arr = await fetchConversations();
      if (!alive) return;

      const qId = sp.get("conversation");
      if (qId && Array.isArray(arr)) {
        const found = arr.find((c) => String(c._id) === String(qId));
        if (found) {
          setSelected(found);
          setFilter(autoFilter(found));
        }
      }
    })();

    const un = onSocket?.("chat:preview", () => {
      fetchConversations();
    });

    return () => {
      alive = false;
      if (typeof un === "function") un();
    };
  }, [fetchConversations, onSocket, sp]);

  // helpers
  const normKind = (k) => String(k || "").toLowerCase().replace(/[\s-]+/g, "_");
  const isLF = (c) => String(c?.source).toLowerCase() === "looking_for";
  const otherEmail = (c) => {
    const b = String(c?.buyer || "").toLowerCase();
    const s = String(c?.seller || "").toLowerCase();
    return b === myEmail ? s : b;
  };
  const displayNameFromEmail = (email) => (email ? String(email).split("@")[0] : "Unknown");
  const titleOf = (c) => (c?.resourceTitle && c.resourceTitle.trim()) || displayNameFromEmail(otherEmail(c));

  const badgeText = (c) => {
    if (!isLF(c)) return "💬 DM";
    const k = normKind(c?.seekingKind);
    if (k === "course_materials") return "📝 Materials";
    if (k === "study_mate") return "👥 Study Buddy";
    if (k === "coffee_chat") return "☕ Coffee Chat";
    return "🎓 Seeking";
  };

  const autoFilter = (c) => {
    if (!isLF(c)) return "all";
    const k = normKind(c?.seekingKind);
    if (k === "course_materials") return "lf_course_materials";
    if (k === "study_mate") return "lf_study_mate";
    if (k === "coffee_chat") return "lf_coffee_chat";
    return "all";
  };

  const filtered = useMemo(() => {
    if (filter === "all") return list;
    const want = filter.replace(/^lf_/, ""); // course_materials | study_mate | coffee_chat
    return list.filter((c) => isLF(c) && normKind(c?.seekingKind) === want);
  }, [list, filter]);

  // URL 동기화
  useEffect(() => {
    const id = selected?._id ? String(selected._id) : null;
    const next = new URLSearchParams(sp.toString());
    if (id) next.set("conversation", id);
    else next.delete("conversation");
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{ backgroundColor: TOKENS.pageBg }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-gray-900 mb-1">Messages</h1>
          <p className="text-sm text-gray-600">
            Chat with classmates and connect
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)]">
          {/* 좌측 리스트 */}
          <div className="lg:w-[360px] shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200 bg-gray-50">
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </Chip>
              <Chip
                active={filter === "lf_course_materials"}
                onClick={() => setFilter("lf_course_materials")}
              >
                Materials
              </Chip>
              <Chip
                active={filter === "lf_study_mate"}
                onClick={() => setFilter("lf_study_mate")}
              >
                Study Buddy
              </Chip>
              <Chip
                active={filter === "lf_coffee_chat"}
                onClick={() => setFilter("lf_coffee_chat")}
              >
                Coffee Chat
              </Chip>
            </div>

            {/* Conversations list */}
            <div className="min-h-0 grow overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : !filtered?.length ? (
                <div className="text-center py-16 px-4">
                  <MessageSquare
                    size={48}
                    className="mx-auto mb-3 text-gray-300"
                  />
                  <p className="text-sm text-gray-500">No conversations yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((c) => {
                    const isSel = selected?._id === c._id;
                    return (
                      <li key={c._id}>
                        <button
                          onClick={() => {
                            setSelected(c);
                            setFilter(autoFilter(c));
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${
                            isSel
                              ? "bg-gray-50 border-l-2"
                              : "hover:bg-gray-50"
                          }`}
                          style={isSel ? { borderLeftColor: TOKENS.accent } : {}}
                        >
                          {/* Avatar */}
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${TOKENS.accent}20, ${TOKENS.accent}40)`,
                            }}
                          >
                            <span className="text-lg">
                              {badgeText(c).split(" ")[0]}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="inline-block px-2 py-0.5 rounded-full text-xs"
                                style={{
                                  backgroundColor: TOKENS.primary,
                                  color: "#fff",
                                }}
                              >
                                {badgeText(c)}
                              </span>
                            </div>
                            <h4 className="text-sm text-gray-900 truncate mb-0.5">
                              {titleOf(c)}
                            </h4>
                            {c.lastMessage && (
                              <p className="text-xs text-gray-500 truncate">
                                {c.lastMessage}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* 우측 채팅창 */}
          <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {selected ? (
              <ChatBox
                conversationId={selected._id}
                userEmail={user?.email}
                otherEmail={otherEmail(selected)}
                otherNickname={titleOf(selected)}
                fullSize
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageSquare size={64} className="mb-4 text-gray-300" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs transition-all"
      style={
        active
          ? {
              backgroundColor: TOKENS.accent,
              color: "#fff",
            }
          : {
              backgroundColor: "#fff",
              border: "1px solid #E5E7EB",
              color: TOKENS.text,
            }
      }
    >
      {children}
    </button>
  );
}








