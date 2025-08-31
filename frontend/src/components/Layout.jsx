// // // 📁 src/components/Layout.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "../contexts/AuthContext";
// import { useSchool } from "../contexts/SchoolContext";
// import useNotificationsPolling from "../hooks/useNotificationsPolling";
// import Footer from "./Footer";
// import ChatBox from "./Chatbox";
// import { useSocket } from "../contexts/SocketContext";
// import { useSchoolPath } from "../utils/schoolPath";

// function Layout() {
//   const { user, logout } = useAuth();
//   const { school } = useSchool();
//   const socket = useSocket(); // { on, off, emit }
//   const navigate = useNavigate();
//   const schoolPath = useSchoolPath();
//   const location = useLocation();

//   // /:school/messages 에서는 플로팅 Chatbox 숨김
//   const onMessagesPage = useMemo(
//     () => /\/messages(\/|$)/.test(location.pathname),
//     [location.pathname]
//   );

//   // 🔔 알림(낙관) 훅 — 네 기존 코드 그대로
//   const {
//     items: notifications,
//     count: badgeCount,
//     optimisticRead,
//     dismiss,
//     markAsRead,
//     markAllAsRead,
//   } = useNotificationsPolling(user?.email, 5000, 60000, 5);

//   const [showModal, setShowModal] = useState(false);
//   const [floatingChat, setFloatingChat] = useState(null);
//   const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
//   const onBellClick = () => setShowModal((v) => !v);

//   // ✅ 어디서든 대화 생성/미리보기 이벤트 수신 → 하단 Chatbox 띄우기 (중복 오픈 방지)
//   useEffect(() => {
//     if (!user) return;

//     const openFromNew = ({ targetEmail, conversationId }) => {
//       if (!conversationId || onMessagesPage) return;
//       if (targetEmail && targetEmail !== user.email) return;
//       setFloatingChat((prev) => (prev?.conversationId === conversationId ? prev : { conversationId }));
//     };

//     const openFromPreview = ({ conversationId }) => {
//       if (!conversationId || onMessagesPage) return;
//       setFloatingChat((prev) => (prev?.conversationId === conversationId ? prev : { conversationId }));
//     };

//     socket.on?.("newConversation", openFromNew);
//     socket.on?.("chat:preview", openFromPreview);

//     return () => {
//       socket.off?.("newConversation", openFromNew);
//       socket.off?.("chat:preview", openFromPreview);
//     };
//   }, [user, socket, onMessagesPage]);

//   // /messages 진입 시 플로팅 창 자동 닫기
//   useEffect(() => {
//     if (onMessagesPage && floatingChat) setFloatingChat(null);
//   }, [onMessagesPage, floatingChat]);

//   return (
//     <div className="flex min-h-screen flex-col bg-cream font-body text-ink">
//       {/* Header */}
//       <header className="fixed left-0 right-0 top-0 z-50 flex h-20 items-center border-b border-sand bg-white/80 px-8 backdrop-blur-sm">
//         <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
//           <button
//             onClick={() => navigate(schoolPath("/dashboard"))}
//             className="font-heading text-2xl font-bold text-ink transition hover:text-softGold"
//           >
//             CNAPSS
//           </button>

//           <div className="relative flex items-center gap-4 font-body text-sm font-medium">
//             <Link to={schoolPath("/freeboard")} className="transition hover:text-softGold">
//               Free Board
//             </Link>

//             <button
//               onClick={() => navigate(schoolPath("/dashboard"))}
//               className="transition hover:text-softGold"
//             >
//               Course Hub
//             </button>

//             <div
//               className="relative"
//               onMouseEnter={() => setShowScheduleDropdown(true)}
//               onMouseLeave={() => setShowScheduleDropdown(false)}
//             >
//               <button className="transition hover:text-softGold">Schedule Grid ▾</button>
//               {showScheduleDropdown && (
//                 <div className="absolute left-0 top-6 z-50 w-48 rounded-md border border-sand bg-white shadow-lg">
//                   <Link to={schoolPath("/personal-schedule")} className="block px-4 py-2 hover:bg-cream">
//                     My Schedule
//                   </Link>
//                   <Link to={schoolPath("/group-availability")} className="block px-4 py-2 hover:bg-cream">
//                     Group Scheduling
//                   </Link>
//                 </div>
//               )}
//             </div>

//             <Link to={schoolPath("/market")} className="transition hover:text-softGold">
//               Marketplace
//             </Link>

//             {user && (
//               <button
//                 onClick={onBellClick}
//                 className="relative transition hover:text-softGold"
//                 aria-label="Notifications"
//               >
//                 🔔
//                 {badgeCount > 0 && (
//                   <span className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1 text-xs leading-none text-white">
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
//                   className="rounded bg-softGold px-3 py-1 font-body font-semibold text-black transition hover:opacity-90"
//                 >
//                   Log out
//                 </button>
//               </>
//             ) : (
//               <>
//                 <Link to="/login" className="font-body text-sm text-ink underline">
//                   Login
//                 </Link>
//                 <Link
//                   to={school ? `/register/${school}` : "/register"}
//                   className="font-body text-sm text-ink underline"
//                 >
//                   Sign Up
//                 </Link>
//               </>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* 🔔 Notifications dropdown — 네 기존과 동일 */}
//       {user && showModal && (
//         <div className="fixed right-8 top-24 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-sand bg-white shadow-xl">
//           <div className="flex items-center justify-between border-b p-4 font-bold text-softGold">
//             <span>Notifications</span>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => {
//                   markAllAsRead();
//                   setShowModal(false);
//                 }}
//                 disabled={notifications.length === 0}
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
//             {notifications.length === 0 ? (
//               <li className="p-3 text-sm text-gray-500">No notifications</li>
//             ) : (
//               notifications.map((n) => {
//                 const read = !!n.readAt;
//                 return (
//                   <li key={n._id}>
//                     <Link
//                       to={schoolPath(`/freeboard/${n.postId}?nid=${n._id}#comment-${n._id}`)}
//                       onClick={async () => {
//                         try {
//                           optimisticRead(n._id);
//                           dismiss(n._id);
//                           await markAsRead(n._id);
//                         } finally {
//                           setShowModal(false);
//                         }
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
//             )}
//           </ul>
//         </div>
//       )}

//       {/* Content */}
//       <main className="flex-grow pt-24 font-body">
//         <Outlet />
//       </main>

//       <Footer />

//       {/* ✅ 플로팅 Chatbox — /messages에선 숨김 */}
//       {!onMessagesPage && floatingChat && user && (
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


import React, { useState, useEffect, useMemo } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  // /:school/messages 에서는 플로팅 Chatbox 숨김
  const onMessagesPage = useMemo(() => /\/messages(\/|$)/.test(location.pathname), [location.pathname]);

  // 알림(낙관) 훅 — 기존 로직 유지
  const {
    items: notifications,
    count: badgeCount,
    optimisticRead,
    dismiss,
    markAsRead,
    markAllAsRead,
  } = useNotificationsPolling(user?.email, 5000, 60000, 5);

  const [showModal, setShowModal] = useState(false);
  const [floatingChat, setFloatingChat] = useState(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const onBellClick = () => setShowModal((v) => !v);

  // 새 대화/미리보기 → 플로팅 채팅 열기
  useEffect(() => {
    if (!user) return;

    const openFromNew = ({ targetEmail, conversationId }) => {
      if (!conversationId || onMessagesPage) return;
      if (targetEmail && targetEmail !== user.email) return;
      setFloatingChat((prev) => (prev?.conversationId === conversationId ? prev : { conversationId }));
    };

    const openFromPreview = ({ conversationId }) => {
      if (!conversationId || onMessagesPage) return;
      setFloatingChat((prev) => (prev?.conversationId === conversationId ? prev : { conversationId }));
    };

    socket.on?.("newConversation", openFromNew);
    socket.on?.("chat:preview", openFromPreview);
    return () => {
      socket.off?.("newConversation", openFromNew);
      socket.off?.("chat:preview", openFromPreview);
    };
  }, [user, socket, onMessagesPage]);

  // /messages 진입 시 플로팅 창 닫기
  useEffect(() => {
    if (onMessagesPage && floatingChat) setFloatingChat(null);
  }, [onMessagesPage, floatingChat]);

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

            {/* ✅ Course Hub 버튼은 이제 /courses 로 이동 */}
            <button
              onClick={() => navigate(schoolPath("/courses"))}
              className="transition hover:text-softGold"
            >
              Course Hub
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

      {/* Notifications */}
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
              notifications.map((n) => {
                const read = !!n.readAt;
                return (
                  <li key={n._id}>
                    <Link
                      to={schoolPath(`/freeboard/${n.postId}?nid=${n._id}#comment-${n._id}`)}
                      onClick={async () => {
                        try {
                          optimisticRead(n._id);
                          dismiss(n._id);
                          await markAsRead(n._id);
                        } finally {
                          setShowModal(false);
                        }
                      }}
                      className={
                        "block p-3 text-sm transition " +
                        (read ? "text-gray-400 hover:bg-gray-100" : "text-gray-700 hover:bg-cream")
                      }
                    >
                      💬 <b>Somebody</b> commented on your {n.parentId ? "comment" : "post"}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Content */}
      <main className="flex-grow pt-24 font-body">
        <Outlet />
      </main>

      <Footer />

      {/* Floating Chatbox — /messages에서는 숨김 */}
      {!onMessagesPage && floatingChat && user && (
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












