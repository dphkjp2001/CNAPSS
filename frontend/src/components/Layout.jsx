// src/components/Layout.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import useNotificationsPolling from "../hooks/useNotificationsPolling";
import { useSchoolPath } from "../utils/schoolPath";

export default function Layout() {
  const { user, logout } = useAuth();
  const { school } = useSchool();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  // 알림(읽음/배지 카운트/목록)
  const { items, count, markAsRead, markAllAsRead } = useNotificationsPolling(
    user?.email,
    5000,
    60000,
    5
  );

  // 알림 모달 & 스케줄 메뉴
  const [showNoti, setShowNoti] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);

  // 배지 ‘뽁’ 애니메이션
  const [bump, setBump] = useState(false);
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (count > prevCountRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      return () => clearTimeout(t);
    }
    prevCountRef.current = count;
  }, [count]);

  const linkCls =
    "px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md";
  const activeCls = "text-violet-700 font-medium bg-violet-50";

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 스케줄 메뉴: 클릭 시 오버레이 토글
  const openScheduleMenu = () => setShowScheduleMenu(true);
  const closeScheduleMenu = () => setShowScheduleMenu(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="w-full border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
          <Link to={school ? schoolPath("/dashboard") : "/"} className="font-bold text-xl">
            CNAPSS
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to={schoolPath("/freeboard")}
              className={({ isActive }) => `${linkCls} ${isActive ? activeCls : ""}`}
            >
              Free Board
            </NavLink>

            <NavLink
              to={schoolPath("/courses")}
              className={({ isActive }) => `${linkCls} ${isActive ? activeCls : ""}`}
            >
              Course Hub
            </NavLink>

            {/* Schedule Menu (버튼 → 오버레이) */}
            <button type="button" onClick={openScheduleMenu} className={linkCls}>
              Schedule Grid
            </button>

            <NavLink
              to={schoolPath("/market")}
              className={({ isActive }) => `${linkCls} ${isActive ? activeCls : ""}`}
            >
              Marketplace
            </NavLink>

            {/* 알림 */}
            <button
              type="button"
              onClick={() => {
                setShowNoti((v) => !v);
                if (!showNoti && count > 0) {
                  // 열자마자 모두 읽음 처리 (선호에 따라 단건으로 바꿔도 됨)
                  markAllAsRead();
                }
              }}
              className="relative ml-1 px-3 py-2 text-sm rounded-md hover:bg-violet-50"
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="i-bell">🔔</span>
              {count > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 inline-flex items-center justify-center
                    min-w-[18px] h-[18px] px-1 rounded-full text-[11px] text-white
                    ${bump ? "animate-ping-once" : ""}`}
                  style={{ backgroundColor: "#7c3aed" }}
                >
                  {count}
                </span>
              )}
            </button>

            {user?.email && (
              <>
                <span className="mx-1 text-sm text-gray-600 hidden sm:inline">
                  {user.email}
                </span>
                <button onClick={onLogout} className={`${linkCls} text-red-600`}>
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Schedule overlay */}
      {showScheduleMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center"
          onClick={closeScheduleMenu}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-4 w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm text-gray-500 mb-2">Schedule</div>
            <div className="flex flex-col gap-2">
              <Link
                to={schoolPath("/schedule")}
                className="rounded-md px-3 py-2 text-sm hover:bg-violet-50"
                onClick={closeScheduleMenu}
              >
                My Schedule
              </Link>
              <Link
                to={schoolPath("/schedule/group")}
                className="rounded-md px-3 py-2 text-sm hover:bg-violet-50"
                onClick={closeScheduleMenu}
              >
                Group Scheduling
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Notifications modal */}
      {showNoti && (
        <div
          className="fixed inset-0 z-40 bg-black/30 flex items-start justify-end p-4"
          onClick={() => setShowNoti(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium">Notifications</div>
              <button
                className="text-sm text-violet-600 hover:underline"
                onClick={() => {
                  markAllAsRead();
                  setShowNoti(false);
                }}
              >
                Mark all as read
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No notifications</div>
              ) : (
                items.map((n) => (
                  <div key={n._id} className="p-4 border-b text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{n.title || "Notification"}</div>
                      <button
                        className="text-violet-600 hover:underline"
                        onClick={() => markAsRead(n._id)}
                      >
                        Read
                      </button>
                    </div>
                    {n.message && (
                      <div className="mt-1 text-gray-600">{n.message}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}















