// // src/components/Layout.jsx
// import React, { useState, useEffect } from "react";
// import { Link, Outlet } from "react-router-dom";
// import { useAuth } from "../contexts/AuthContext";
// import useNotificationsPolling from "../hooks/useNotificationsPolling";
// import Footer from "./Footer";
// import ChatBox from "./Chatbox";
// import { useSocket } from "../contexts/SocketContext";

// function Layout() {
//   const { user, logout } = useAuth();
//   const socket = useSocket();
//   const notifications = useNotificationsPolling(user?.email);
//   const [showModal, setShowModal] = useState(false);
//   const [floatingChat, setFloatingChat] = useState(null);
//   const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

//   useEffect(() => {
//     if (!user || !socket) return;

//     const handleNewConversation = ({ targetEmail, conversationId }) => {
//       if (targetEmail === user.email) {
//         setFloatingChat({ conversationId });
//       }
//     };

//     socket.on("newConversation", handleNewConversation);

//     return () => {
//       socket.off("newConversation", handleNewConversation);
//     };
//   }, [user, socket]);

//   return (
//     <div className="flex flex-col min-h-screen bg-cream text-ink font-body">
//       {/* 상단 네비게이션 */}
//       <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-sand z-50 h-20 flex items-center px-8">
//         <div className="flex justify-between w-full items-center max-w-7xl mx-auto">
//           <Link to="/dashboard" className="text-2xl font-heading font-bold text-ink hover:text-softGold transition">
//             CNAPSS
//           </Link>
//           <div className="flex items-center gap-4 text-sm font-body font-medium relative">
//             <Link to="/freeboard" className="hover:text-softGold transition">Free Board</Link>
//             <Link to="/recommend" className="hover:text-softGold transition">Course Recs</Link>

//             {/* Schedule Grid Dropdown */}
//             <div
//               className="relative"
//               onMouseEnter={() => setShowScheduleDropdown(true)}
//               onMouseLeave={() => setShowScheduleDropdown(false)}
//             >
//               <button className="hover:text-softGold transition">Schedule Grid ▾</button>
//               {showScheduleDropdown && (
//                 <div className="absolute top-6 left-0 bg-white border border-sand shadow-lg rounded-md z-50 w-48">
//                   <Link to="/personal-schedule" className="block px-4 py-2 hover:bg-cream">My Schedule</Link>
//                   <Link to="/group-availability" className="block px-4 py-2 hover:bg-cream">Group Scheduling</Link>
//                 </div>
//               )}
//             </div>

//             <Link to="/market" className="hover:text-softGold transition">Marketplace</Link>

//             {user && (
//               <button
//                 onClick={() => setShowModal(!showModal)}
//                 className="relative hover:text-softGold transition"
//               >
//                 🔔
//                 {notifications.length > 0 && (
//                   <span className="absolute -top-1 -right-2 bg-red-500 text-white rounded-full px-1 text-xs leading-none">
//                     {notifications.length}
//                   </span>
//                 )}
//               </button>
//             )}
//             {user ? (
//               <>
//                 <span className="text-xs text-gray-500">{user.email}</span>
//                 <button
//                   onClick={logout}
//                   className="bg-softGold text-black px-3 py-1 rounded hover:opacity-90 transition font-body font-semibold"
//                 >
//                   Log out
//                 </button>
//               </>
//             ) : (
//               <>
//                 <Link to="/login" className="text-sm underline text-ink font-body">Login</Link>
//                 <Link to="/register" className="text-sm underline text-ink font-body">Sign Up</Link>
//               </>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* 알림 모달 */}
//       {showModal && (
//         <div className="fixed top-24 right-8 bg-white border border-sand shadow-xl rounded-lg w-80 max-h-96 overflow-y-auto z-50">
//           <div className="p-4 border-b font-bold text-softGold flex justify-between items-center">
//             Notifications
//             <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-red-500">✕</button>
//           </div>
//           <ul className="divide-y">
//             {notifications.length > 0 ? (
//               notifications.map((n) => (
//                 <li key={n._id}>
//                   <Link
//                     to={`/freeboard/${n.postId}#comment-${n._id}`}
//                     onClick={() => setShowModal(false)}
//                     className="block p-3 text-sm text-gray-700 hover:bg-cream transition"
//                   >
//                     💬 <b>{n.nickname}</b> commented on your {n.parentId ? "comment" : "post"}
//                   </Link>
//                 </li>
//               ))
//             ) : (
//               <li className="p-3 text-sm text-gray-500">No new notifications</li>
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




// src/components/Layout.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useNotificationsPolling from "../hooks/useNotificationsPolling";
import Footer from "./Footer";
import ChatBox from "./Chatbox";
import { useSocket } from "../contexts/SocketContext";

function Layout() {
  const { user, logout } = useAuth();
  const socket = useSocket();

  // ✅ 새 훅 사용: items(목록), unread(개수), nextCursor(페이지네이션), refresh/loadMore
  const {
    items,
    unread,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = useNotificationsPolling(user?.email, { interval: 15000, limit: 20 });

  const [showModal, setShowModal] = useState(false);
  const [floatingChat, setFloatingChat] = useState(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

  // 🔁 새 대화 알림 → 플로팅 채팅 박스 오픈
  useEffect(() => {
    if (!user || !socket) return;
    const handleNewConversation = ({ targetEmail, conversationId }) => {
      if (targetEmail === user.email) {
        setFloatingChat({ conversationId });
      }
    };
    socket.on("newConversation", handleNewConversation);
    return () => socket.off("newConversation", handleNewConversation);
  }, [user, socket]);

  // 🔔 모달 열릴 때 최신화
  useEffect(() => {
    if (showModal && user?.email) {
      refresh();
    }
  }, [showModal, user?.email, refresh]);

  // ✅ 모두 읽음 처리
  const handleMarkAllRead = useCallback(async () => {
    if (!user?.email) return;
    try {
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      await fetch(
        `${base}/api/notification/${encodeURIComponent(user.email)}/mark-all-read`,
        { method: "PATCH" }
      );
      await refresh();
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  }, [user?.email, refresh]);

  return (
    <div className="flex flex-col min-h-screen bg-cream text-ink font-body">
      {/* 상단 네비게이션 */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-sand z-50 h-20 flex items-center px-8">
        <div className="flex justify-between w-full items-center max-w-7xl mx-auto">
          <Link to="/dashboard" className="text-2xl font-heading font-bold text-ink hover:text-softGold transition">
            CNAPSS
          </Link>
          <div className="flex items-center gap-4 text-sm font-body font-medium relative">
            <Link to="/freeboard" className="hover:text-softGold transition">Free Board</Link>
            <Link to="/recommend" className="hover:text-softGold transition">Course Recs</Link>

            {/* Schedule Grid Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShowScheduleDropdown(true)}
              onMouseLeave={() => setShowScheduleDropdown(false)}
            >
              <button className="hover:text-softGold transition">Schedule Grid ▾</button>
              {showScheduleDropdown && (
                <div className="absolute top-6 left-0 bg-white border border-sand shadow-lg rounded-md z-50 w-48">
                  <Link to="/personal-schedule" className="block px-4 py-2 hover:bg-cream">My Schedule</Link>
                  <Link to="/group-availability" className="block px-4 py-2 hover:bg-cream">Group Scheduling</Link>
                </div>
              )}
            </div>

            <Link to="/market" className="hover:text-softGold transition">Marketplace</Link>

            {user && (
              <button
                onClick={() => setShowModal(!showModal)}
                className="relative hover:text-softGold transition"
              >
                🔔
                {Number(unread) > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white rounded-full px-1 text-xs leading-none">
                    {unread}
                  </span>
                )}
              </button>
            )}
            {user ? (
              <>
                <span className="text-xs text-gray-500">{user.email}</span>
                <button
                  onClick={logout}
                  className="bg-softGold text-black px-3 py-1 rounded hover:opacity-90 transition font-body font-semibold"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm underline text-ink font-body">Login</Link>
                <Link to="/register" className="text-sm underline text-ink font-body">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 알림 모달 */}
      {showModal && (
        <div className="fixed top-24 right-8 bg-white border border-sand shadow-xl rounded-lg w-80 max-h-96 overflow-y-auto z-50">
          <div className="p-4 border-b font-bold text-softGold flex justify-between items-center">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                disabled={loading || unread === 0}
              >
                Mark all read
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>

          <ul className="divide-y">
            {items?.length > 0 ? (
              <>
                {items.map((n) => (
                  <li key={n._id}>
                    <Link
                      to={`/freeboard/${n.postId}#comment-${n._id}`}
                      onClick={() => setShowModal(false)}
                      className="block p-3 text-sm text-gray-700 hover:bg-cream transition"
                    >
                      💬 <b>{n.nickname}</b> commented on your {n.parentId ? "comment" : "post"}
                      {/* optionally show time */}
                      {/* <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div> */}
                    </Link>
                  </li>
                ))}
                {nextCursor && (
                  <li className="p-3">
                    <button
                      onClick={loadMore}
                      className="w-full text-sm border border-sand rounded-md py-1 hover:bg-cream disabled:opacity-50"
                      disabled={loadingMore}
                    >
                      {loadingMore ? "Loading..." : "Load more"}
                    </button>
                  </li>
                )}
              </>
            ) : (
              <li className="p-3 text-sm text-gray-500">
                {loading ? "Loading..." : "No notifications"}
              </li>
            )}
            {error && (
              <li className="p-3 text-xs text-red-500">Failed to load notifications</li>
            )}
          </ul>
        </div>
      )}

      {/* 본문 + Footer */}
      <main className="flex-grow pt-24 font-body">
        <Outlet />
      </main>

      <Footer />

      {/* ✅ 자동 채팅 박스 */}
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
