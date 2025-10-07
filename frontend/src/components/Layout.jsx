// src/components/Layout.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import useNotificationsPolling from "../hooks/useNotificationsPolling";
import { useSchoolPath } from "../utils/schoolPath";

function Initials({ name = "GU", bg = "#f1ecff" }) {
  const text = String(name || "GU").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-gray-900"
      style={{ background: bg }}
    >
      {text}
    </div>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm ${
          isActive ? "bg-red-50 text-red-600 font-semibold" : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { school, schoolTheme } = useSchool();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  // notifications
  const { items, count, markAsRead, markAllAsRead } = useNotificationsPolling(
    user?.email,
    5000,
    60000,
    5
  );

  const [showNoti, setShowNoti] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
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

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const nickname = user?.nickname || (user?.email ? user.email.split("@")[0] : "GU");

  // ✅ Quick Actions → 대시보드 탭으로 이동
  const goReviewsHub = () => {
    if (!school) return navigate("/select-school");
    navigate(schoolPath("/reviews"));
    setShowQuick(false);
  };
  const goAskQuestion = () => {
    if (!school) return navigate("/select-school");
    navigate(schoolPath("/dashboard?tab=academic"));
    setShowQuick(false);
  };
  const goLookingFor = () => {
    if (!school) return navigate("/select-school");
    navigate(schoolPath("/dashboard?tab=academic"));
    setShowQuick(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* === Left Sidebar === */}
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-white">
        <div className="p-4 border-b">
          <Link to={school ? schoolPath("/dashboard") : "/"} className="inline-flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white font-black">C</span>
            <span className="text-lg font-extrabold tracking-tight">CNAPSS</span>
          </Link>
          {school && <div className="mt-1 text-xs text-gray-500 truncate">{String(school)}</div>}
        </div>

        <nav className="p-3 space-y-1">
          <NavItem to={schoolPath("/dashboard")}>Dashboard</NavItem>
          {/* ✅ 리스트 메뉴는 탭으로 연결 */}
          <NavItem to={schoolPath("/dashboard?tab=free")}>Free Board</NavItem>
          <NavItem to={schoolPath("/dashboard?tab=academic")}>Career Board</NavItem>
          <NavItem to={schoolPath("/courses")}>Course Hub</NavItem>
          <NavItem to={schoolPath("/reviews")}>Reviews</NavItem>
          <NavItem to={schoolPath("/market")}>Marketplace</NavItem>
          <NavItem to={schoolPath("/messages")}>Messages</NavItem>
          <NavItem to={schoolPath("/foodmap")}>Food Map</NavItem>
          <div className="mt-4 border-t pt-3">
            <NavItem to={schoolPath("/myposts")}>My Posts</NavItem>
            <NavItem to={schoolPath("/liked")}>Liked</NavItem>
            <NavItem to={schoolPath("/commented")}>Commented</NavItem>
          </div>
        </nav>

        <div className="mt-auto p-3 text-[11px] text-gray-400">Stay anonymous. Be kind.</div>
      </aside>

      {/* === Main column === */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="w-full border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-end gap-2">
            {/* Quick Actions */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowQuick((v) => !v);
                  setShowProfile(false);
                  setShowNoti(false);
                }}
                className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50"
                title="Quick Actions"
                aria-label="Quick Actions"
              >
                ⭐ Quick
              </button>
              {showQuick && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowQuick(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white shadow-lg">
                    <div className="p-1 text-sm">
                      <button
                        className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-100"
                        onClick={goReviewsHub}
                      >
                        ⭐ Rate Course / Professor
                      </button>
                      <button
                        className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-100"
                        onClick={goAskQuestion}
                      >
                        ❓ Ask Academic Question
                      </button>
                      <div className="my-1 border-t" />
                      <button
                        className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-100"
                        onClick={goLookingFor}
                      >
                        📥 Post “Looking For”
                      </button>
                    </div>
                    <div className="px-3 py-2 border-t text-[11px] text-gray-500">
                      No public links; exchange via DMs.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => {
                setShowNoti((v) => !v);
                setShowProfile(false);
                setShowQuick(false);
                if (!showNoti && count > 0) markAllAsRead();
              }}
              className="relative ml-1 px-3 py-2 text-sm rounded-md hover:bg-violet-50"
              aria-label="Notifications"
              title="Notifications"
            >
              <span>🔔</span>
              {count > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 inline-flex items-center justify-center
                    min-w-[18px] h-[18px] px-1 rounded-full text-[11px] text-white`}
                  style={{ backgroundColor: "#7c3aed" }}
                >
                  {count}
                </span>
              )}
            </button>

            {/* Auth / Profile */}
            {user?.email ? (
              <ProfileMenu
                nickname={nickname}
                email={user.email}
                onLogout={onLogout}
                schoolPath={schoolPath}
                showProfile={showProfile}
                setShowProfile={setShowProfile}
              />
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md">
                  Log in
                </Link>
                <Link to="/register" className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md">
                  Register
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Notifications modal */}
        {showNoti && (
          <div
            className="fixed inset-0 z-40 bg-black/30 flex items-start justify-end p-4"
            onClick={() => setShowNoti(false)}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="font-medium">Notifications</div>
                <button className="text-sm text-violet-600 hover:underline" onClick={() => { markAllAsRead(); setShowNoti(false); }}>
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
                        <button className="text-violet-600 hover:underline" onClick={() => markAsRead(n._id)}>
                          Read
                        </button>
                      </div>
                      {n.message && <div className="mt-1 text-gray-600">{n.message}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Routed pages */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProfileMenu({ nickname, email, onLogout, schoolPath, showProfile, setShowProfile }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowProfile((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-violet-50"
      >
        <Initials name={nickname} />
        <span className="hidden sm:inline text-sm font-medium text-gray-700">{nickname}</span>
        <svg className={`h-4 w-4 text-gray-500 transition ${showProfile ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>

      {showProfile && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white shadow-lg">
            <div className="px-3 py-2 border-b">
              <div className="text-sm font-semibold">{nickname}</div>
              <div className="text-xs text-gray-500 truncate">{email}</div>
            </div>
            <div className="p-1 text-sm">
              <MenuItem to={schoolPath("/dashboard")} onClick={() => setShowProfile(false)}>
                Dashboard
              </MenuItem>
              <MenuItem to={schoolPath("/myposts")} onClick={() => setShowProfile(false)}>
                My Posts
              </MenuItem>
              <MenuItem to={schoolPath("/liked")} onClick={() => setShowProfile(false)}>
                Liked
              </MenuItem>
              <MenuItem to={schoolPath("/commented")} onClick={() => setShowProfile(false)}>
                Commented
              </MenuItem>
              <MenuItem to={schoolPath("/messages")} onClick={() => setShowProfile(false)}>
                Messages
              </MenuItem>
              <MenuItem to={schoolPath("/market")} onClick={() => setShowProfile(false)}>
                Marketplace
              </MenuItem>
              <MenuItem to={schoolPath("/foodmap")} onClick={() => setShowProfile(false)}>
                Food Map
              </MenuItem>
            </div>
            <div className="border-t p-1">
              <button onClick={onLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ to, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="block rounded-lg px-3 py-2 hover:bg-violet-50 text-gray-700">
      {children}
    </Link>
  );
}
























