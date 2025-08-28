// // 📁 src/components/Layout.jsx
// import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
// import { Link, Outlet, useNavigate } from "react-router-dom";
// import { useAuth } from "../contexts/AuthContext";
// import { useSchool } from "../contexts/SchoolContext";
// import useNotificationsPolling from "../hooks/useNotificationsPolling";
// import Footer from "./Footer";
// import ChatBox from "./Chatbox";
// import { useSocket } from "../contexts/SocketContext";
// import { useSchoolPath } from "../utils/schoolPath"; // ✅ school-scoped path builder

// function Layout() {
//   const { user, logout } = useAuth();
//   const { school } = useSchool(); // ✅ for register prefill
//   const socket = useSocket();
//   const navigate = useNavigate();
//   const schoolPath = useSchoolPath(); // ✅ use everywhere for links

//   // ✅ 활성 5초 / 비활성 60초 / 최근 5분만
//   const notifications = useNotificationsPolling(user?.email, 5000, 60000, 5);

//   const [showModal, setShowModal] = useState(false);
//   const [floatingChat, setFloatingChat] = useState(null);
//   const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

//   // --- API base ---
//   const baseApi = useMemo(
//     () => (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""),
//     []
//   );

//   // --- 뱃지 카운트 & 애니메이션 ---
//   const [badgeCount, setBadgeCount] = useState(0);
//   const prevBadgeRef = useRef(0);
//   const [bump, setBump] = useState(false);

//   useEffect(() => {
//     if (!showModal) setBadgeCount(notifications.length);
//   }, [notifications.length, showModal]);

//   useEffect(() => {
//     if (badgeCount > prevBadgeRef.current) {
//       setBump(true);
//       const t = setTimeout(() => setBump(false), 300);
//       return () => clearTimeout(t);
//     }
//     prevBadgeRef.current = badgeCount;
//   }, [badgeCount]);

//   // --- 읽음 상태(로컬 표시용) ---
//   const [readIds, setReadIds] = useState(new Set());
//   const isRead = (id) => readIds.has(id);

//   // 단건 읽음 (유지)
//   const markRead = useCallback(
//     async (commentId) => {
//       try {
//         await fetch(`${baseApi}/notification/mark-read`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ commentId, email: user?.email }),
//         });
//       } catch (e) {
//         console.warn("mark-read failed", e);
//       }
//     },
//     [baseApi, user?.email]
//   );

//   // ✅ 모두 읽음 (신규) — 백엔드 일괄 처리 API 호출
//   const handleMarkAllRead = useCallback(async () => {
//     if (!user?.email || notifications.length === 0) return;
//     try {
//       await fetch(`${baseApi}/notification/mark-all-read`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: user.email, minutes: 5 }),
//       });

//       setBadgeCount(0);
//       setReadIds((prev) => new Set([...prev, ...notifications.map((n) => n._id)]));
//       setShowModal(false);
//     } catch (e) {
//       console.error("mark-all-read failed", e);
//     }
//   }, [baseApi, user?.email, notifications]);

//   // 벨 클릭 → 모달 토글
//   const onBellClick = () => setShowModal((v) => !v);

//   // 새 대화 → 플로팅 채팅
//   useEffect(() => {
//     if (!user || !socket) return;
//     const handleNewConversation = ({ targetEmail, conversationId }) => {
//       if (targetEmail === user.email) setFloatingChat({ conversationId });
//     };
//     socket.on("newConversation", handleNewConversation);
//     return () => socket.off("newConversation", handleNewConversation);
//   }, [user, socket]);

//   return (
//     <div className="flex flex-col min-h-screen bg-cream text-ink font-body">
//       {/* 상단 네비게이션 */}
//       <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-sand z-50 h-20 flex items-center px-8">
//         <div className="flex justify-between w-full items-center max-w-7xl mx-auto">
//           <button
//             onClick={() => navigate(schoolPath("/dashboard"))} // ✅ always /:school/dashboard
//             className="text-2xl font-heading font-bold text-ink hover:text-softGold transition"
//           >
//             CNAPSS
//           </button>

//           <div className="flex items-center gap-4 text-sm font-body font-medium relative">
//             <Link to={schoolPath("/freeboard")} className="hover:text-softGold transition">
//               Free Board
//             </Link>

//             {/* Course Recs: 라우트 미정이면 대시보드로 대체 */}
//             <button
//               onClick={() => navigate(schoolPath("/dashboard"))}
//               className="hover:text-softGold transition"
//             >
//               Course Recs
//             </button>

//             {/* Schedule Grid Dropdown */}
//             <div
//               className="relative"
//               onMouseEnter={() => setShowScheduleDropdown(true)}
//               onMouseLeave={() => setShowScheduleDropdown(false)}
//             >
//               <button className="hover:text-softGold transition">Schedule Grid ▾</button>
//               {showScheduleDropdown && (
//                 <div className="absolute top-6 left-0 bg-white border border-sand shadow-lg rounded-md z-50 w-48">
//                   <Link to={schoolPath("/personal-schedule")} className="block px-4 py-2 hover:bg-cream">
//                     My Schedule
//                   </Link>
//                   <Link to={schoolPath("/group-availability")} className="block px-4 py-2 hover:bg-cream">
//                     Group Scheduling
//                   </Link>
//                 </div>
//               )}
//             </div>

//             <Link to={schoolPath("/market")} className="hover:text-softGold transition">
//               Marketplace
//             </Link>

//             {user && (
//               <button
//                 onClick={onBellClick}
//                 className="relative hover:text-softGold transition"
//                 aria-label="Notifications"
//               >
//                 🔔
//                 {badgeCount > 0 && (
//                   <span
//                     className={
//                       "absolute -top-1 -right-2 bg-red-500 text-white rounded-full px-1 text-xs leading-none " +
//                       (bump ? "animate-bounce" : "")
//                     }
//                   >
//                     {badgeCount}
//                   </span>
//                 )}
//               </button>
//             )}

//             {user ? (
//               <>
//                 <span className="text-xs text-gray-500">{user.email}</span>
//                 <button
//                   onClick={() => {
//                     logout();
//                     navigate("/login");
//                   }}
//                   className="bg-softGold text-black px-3 py-1 rounded hover:opacity-90 transition font-body font-semibold"
//                 >
//                   Log out
//                 </button>
//               </>
//             ) : (
//               <>
//                 <Link to="/login" className="text-sm underline text-ink font-body">
//                   Login
//                 </Link>
//                 <Link
//                   to={school ? `/register/${school}` : "/register"} // ✅ prefill school on register
//                   className="text-sm underline text-ink font-body"
//                 >
//                   Sign Up
//                 </Link>
//               </>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* 알림 모달 */}
//       {showModal && (
//         <div className="fixed top-24 right-8 bg-white border border-sand shadow-xl rounded-lg w-80 max-h-96 overflow-y-auto z-50">
//           <div className="p-4 border-b font-bold text-softGold flex justify-between items-center">
//             <span>Notifications</span>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleMarkAllRead}
//                 disabled={!user?.email || notifications.length === 0}
//                 className="text-xs text-blue-600 hover:underline disabled:opacity-40"
//               >
//                 Mark all read
//               </button>
//               <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-red-500">
//                 ✕
//               </button>
//             </div>
//           </div>
//           <ul className="divide-y">
//             {notifications.length > 0 ? (
//               notifications.map((n) => {
//                 const read = isRead(n._id);
//                 return (
//                   <li key={n._id} className={read ? "bg-gray-50" : ""}>
//                     <Link
//                       to={schoolPath(`/freeboard/${n.postId}#comment-${n._id}`)} // ✅ scoped link
//                       onClick={async () => {
//                         if (!read) {
//                           setReadIds((prev) => new Set(prev).add(n._id));
//                           await markRead(n._id);
//                         }
//                         setShowModal(false);
//                       }}
//                       className={
//                         "block p-3 text-sm transition " +
//                         (read ? "text-gray-400 hover:bg-gray-100" : "text-gray-700 hover:bg-cream")
//                       }
//                     >
//                       💬 <b>Somebody</b> commented on your {n.parentId ? "comment" : "post"}
//                     </Link>
//                   </li>
//                 );
//               })
//             ) : (
//               <li className="p-3 text-sm text-gray-500">No notifications</li>
//             )}
//           </ul>
//         </div>
//       )}

//       {/* 본문 + Footer */}
//       <main className="flex-grow pt-24 font-body">
//         <Outlet />
//       </main>

//       <Footer />

//       {/* ✅ 자동 채팅 박스 */}
//       {floatingChat && user && (
//         <div className="fixed bottom-4 right-4 z-50 shadow-lg">
//           <ChatBox
//             conversationId={floatingChat.conversationId}
//             userEmail={user.email}
//             onClose={() => setFloatingChat(null)}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// export default Layout;



// 📁 src/components/Layout.jsx
import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import useNotificationsPolling from "../hooks/useNotificationsPolling";
import Footer from "./Footer";
import ChatBox from "./Chatbox";
import { useSocket } from "../contexts/SocketContext";
import { useSchoolPath } from "../utils/schoolPath";

function Layout() {
  const { user, logout } = useAuth();
  const { school } = useSchool();
  const socket = useSocket();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  // 🔔 폴링 + 낙관적 업데이트 훅 (C 단계: 클릭 즉시 제거 포함)
  const {
    items: notifications,
    count: badgeCount,
    optimisticRead,
    dismiss,          // ← 새로 추가된 즉시 제거
    markAsRead,
    markAllAsRead,
  } = useNotificationsPolling(user?.email, 5000, 60000, 5);

  const [showModal, setShowModal] = useState(false);
  const [floatingChat, setFloatingChat] = useState(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

  const onBellClick = () => setShowModal((v) => !v);

  // 새 대화 → 플로팅 채팅
  useEffect(() => {
    if (!user || !socket) return;
    const handleNewConversation = ({ targetEmail, conversationId }) => {
      if (targetEmail === user.email) setFloatingChat({ conversationId });
    };
    socket.on("newConversation", handleNewConversation);
    return () => socket.off("newConversation", handleNewConversation);
  }, [user, socket]);

  return (
    <div className="flex min-h-screen flex-col bg-cream font-body text-ink">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-20 items-center border-b border-sand bg-white/80 px-8 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <button
            onClick={() => navigate(schoolPath("/dashboard"))}
            className="font-heading text-2xl font-bold text-ink transition hover:text-softGold"
          >
            CNAPSS
          </button>

          <div className="relative flex items-center gap-4 font-body text-sm font-medium">
            <Link to={schoolPath("/freeboard")} className="transition hover:text-softGold">
              Free Board
            </Link>

            <button
              onClick={() => navigate(schoolPath("/dashboard"))}
              className="transition hover:text-softGold"
            >
              Course Recs
            </button>

            <div
              className="relative"
              onMouseEnter={() => setShowScheduleDropdown(true)}
              onMouseLeave={() => setShowScheduleDropdown(false)}
            >
              <button className="transition hover:text-softGold">Schedule Grid ▾</button>
              {showScheduleDropdown && (
                <div className="absolute left-0 top-6 z-50 w-48 rounded-md border border-sand bg-white shadow-lg">
                  <Link to={schoolPath("/personal-schedule")} className="block px-4 py-2 hover:bg-cream">
                    My Schedule
                  </Link>
                  <Link to={schoolPath("/group-availability")} className="block px-4 py-2 hover:bg-cream">
                    Group Scheduling
                  </Link>
                </div>
              )}
            </div>

            <Link to={schoolPath("/market")} className="transition hover:text-softGold">
              Marketplace
            </Link>

            {user && (
              <button
                onClick={onBellClick}
                className="relative transition hover:text-softGold"
                aria-label="Notifications"
              >
                🔔
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1 text-xs leading-none text-white">
                    {badgeCount}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <>
                <span className="text-xs text-gray-500">{user.email}</span>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="rounded bg-softGold px-3 py-1 font-body font-semibold text-black transition hover:opacity-90"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-body text-sm text-ink underline">
                  Login
                </Link>
                <Link
                  to={school ? `/register/${school}` : "/register"}
                  className="font-body text-sm text-ink underline"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 🔔 Notifications dropdown */}
      {user && showModal && (
        <div className="fixed right-8 top-24 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-sand bg-white shadow-xl">
          <div className="flex items-center justify-between border-b p-4 font-bold text-softGold">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  markAllAsRead();
                  setShowModal(false);
                }}
                disabled={notifications.length === 0}
                className="text-xs text-blue-600 hover:underline disabled:opacity-40"
              >
                Mark all read
              </button>
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-red-500">
                ✕
              </button>
            </div>
          </div>
          <ul className="divide-y">
            {notifications.length === 0 ? (
              <li className="p-3 text-sm text-gray-500">No notifications</li>
            ) : (
              notifications.map((n) => (
                <li key={n._id}>
                  <Link
                    to={schoolPath(`/freeboard/${n.postId}?nid=${n._id}#comment-${n._id}`)}
                    onClick={() => {
                      // ✅ 클릭 즉시: 배지 감소 + 목록에서 제거 (낙관적)
                      optimisticRead(n._id);
                      dismiss(n._id);
                      // 서버에 읽음 반영(실패해도 다음 폴링으로 보정)
                      markAsRead(n._id);
                      setShowModal(false);
                    }}
                    className="block p-3 text-sm text-gray-700 transition hover:bg-cream"
                  >
                    💬 <b>Somebody</b> commented on your {n.parentId ? "comment" : "post"}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Content */}
      <main className="flex-grow pt-24 font-body">
        <Outlet />
      </main>

      <Footer />

      {/* Floating chat */}
      {floatingChat && user && (
        <div className="fixed bottom-4 right-4 z-50 shadow-lg">
          <ChatBox
            conversationId={floatingChat.conversationId}
            userEmail={user.email}
            onClose={() => setFloatingChat(null)}
          />
        </div>
      )}
    </div>
  );
}

export default Layout;









