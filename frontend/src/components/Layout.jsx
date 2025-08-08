// src/components/Layout.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useNotificationsPolling from "../hooks/useNotificationsPolling";
import Footer from "./Footer";
import ChatBox from "./Chatbox";
import { useSocket } from "../contexts/SocketContext";

function Layout() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  // ✅ 활성 탭 5초 / 비활성 탭 60초 / 조회기간 5분
  const notifications = useNotificationsPolling(user?.email, 5000, 60000, 5);

  const [showModal, setShowModal] = useState(false);
  const [floatingChat, setFloatingChat] = useState(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

  // --- 알림 뱃지 카운트 & 애니메이션 ---
  const [badgeCount, setBadgeCount] = useState(0);
  const prevBadgeRef = useRef(0);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    // 모달이 닫혀 있을 때만 외부 변화로 카운트 반영
    if (!showModal) {
      setBadgeCount(notifications.length);
    }
  }, [notifications.length, showModal]);

  useEffect(() => {
    if (badgeCount > prevBadgeRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300); // 300ms만 반짝
      return () => clearTimeout(t);
    }
    prevBadgeRef.current = badgeCount;
  }, [badgeCount]);

  // --- 읽음 처리(모달 열면 현재 보이는 것들 서버에 즉시 read로 기록) ---
  const baseApi = useMemo(
    () => (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""),
    []
  );
  const [readIds, setReadIds] = useState(new Set());

  const markRead = useCallback(
    async (commentId) => {
      try {
        await fetch(`${baseApi}/notification/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentId, email: user?.email }),
        });
      } catch (e) {
        // 콘솔만 찍고 UI는 그대로 둠
        console.warn("mark-read failed", e);
      }
    },
    [baseApi, user?.email]
  );

  const markAllVisibleAsRead = useCallback(async () => {
    if (!user?.email || notifications.length === 0) return;
    const ids = notifications.map((n) => n._id);
    // 1) 로컬 뱃지 즉시 0
    setBadgeCount(0);
    // 2) 로컬 표시용 readIds에 추가 → 회색 처리
    setReadIds((prev) => new Set([...prev, ...ids]));
    // 3) 서버에도 순차 반영(실패해도 UX 유지)
    ids.forEach((id) => markRead(id));
  }, [notifications, user?.email, markRead]);

  // 벨 클릭 → 모달 토글 + 열릴 때 읽음 처리
  const onBellClick = () => {
    setShowModal((open) => {
      const next = !open;
      if (!open && notifications.length > 0) {
        // 모달을 "열 때"만 처리
        markAllVisibleAsRead();
      }
      return next;
    });
  };

  // --- 새 대화 알림 → 플로팅 채팅 박스 오픈 ---
  useEffect(() => {
    if (!user || !socket) return;
    const handleNewConversation = ({ targetEmail, conversationId }) => {
      if (targetEmail === user.email) setFloatingChat({ conversationId });
    };
    socket.on("newConversation", handleNewConversation);
    return () => socket.off("newConversation", handleNewConversation);
  }, [user, socket]);

  // 읽은 스타일 헬퍼
  const isRead = (id) => readIds.has(id);

  return (
    <div className="flex flex-col min-h-screen bg-cream text-ink font-body">
      {/* 상단 네비게이션 */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-sand z-50 h-20 flex items-center px-8">
        <div className="flex justify-between w-full items-center max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-2xl font-heading font-bold text-ink hover:text-softGold transition"
          >
            CNAPSS
          </button>

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
                onClick={onBellClick}
                className="relative hover:text-softGold transition"
                aria-label="Notifications"
              >
                🔔
                {badgeCount > 0 && (
                  <span
                    className={
                      "absolute -top-1 -right-2 bg-red-500 text-white rounded-full px-1 text-xs leading-none " +
                      (bump ? "animate-bounce" : "")
                    }
                  >
                    {badgeCount}
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
            <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-red-500">✕</button>
          </div>
          <ul className="divide-y">
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const read = isRead(n._id);
                return (
                  <li key={n._id} className={read ? "bg-gray-50" : ""}>
                    <Link
                      to={`/freeboard/${n.postId}#comment-${n._id}`}
                      onClick={async () => {
                        // 단건 클릭 시에도 읽음 처리(중복 방지)
                        if (!read) {
                          setReadIds((prev) => new Set(prev).add(n._id));
                          await markRead(n._id);
                        }
                        setShowModal(false);
                      }}
                      className={
                        "block p-3 text-sm transition " +
                        (read ? "text-gray-400 hover:bg-gray-100" : "text-gray-700 hover:bg-cream")
                      }
                    >
                      💬 <b>Somebody</b> commented on your {n.parentId ? "comment" : "post"}
                      {/* <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div> */}
                    </Link>
                  </li>
                );
              })
            ) : (
              <li className="p-3 text-sm text-gray-500">No notifications</li>
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





