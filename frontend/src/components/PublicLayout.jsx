import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function SideLink({ to, children }) {
  return (
    <Link to={to} className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
      {children}
    </Link>
  );
}

export default function PublicLayout({ fullBleed = false }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const f = location.state?.flash;
    if (f) {
      setFlash(f);
      try {
        const { pathname, search, hash } = window.location;
        window.history.replaceState({}, "", pathname + search + hash);
      } catch {}
      const t = setTimeout(() => setFlash(null), 3500);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  // 전폭 레이아웃 (랜딩)
  if (fullBleed) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {flash && (
          <div className="border-b bg-amber-50 text-amber-900">
            <div className="mx-auto max-w-6xl px-4 py-2 text-sm">{flash.message}</div>
          </div>
        )}
        <main className="flex-1 pt-0">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-white">
        <div className="p-6 border-b flex flex-col items-start">
          <Link
            to="/"
            className="font-extrabold text-[30px] tracking-wide text-[#E54848] hover:opacity-90 transition-opacity"
          >
            CNAPSS
          </Link>
        </div>
        <nav className="p-3 space-y-1">
          <SideLink to="/about">About</SideLink>
          {user?.email ? (
            <SideLink to={`/${encodeURIComponent(user.school || "")}/dashboard`}>Go to dashboard</SideLink>
          ) : null}
        </nav>
        <div className="mt-auto p-3">
          {user?.email ? (
            <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              Log out
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" className="rounded-lg px-3 py-2 text-center text-sm text-white bg-red-600 hover:bg-red-700">
                Log in
              </Link>
              <Link to="/register" className="rounded-lg px-3 py-2 text-center text-sm border text-gray-700 hover:bg-gray-100">
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Right column */}
      <div className="flex-1 min-w-0 flex flex-col mt-4 md:mt-6 lg:mt-8">
        {flash && (
          <div className="border-b bg-amber-50 text-amber-900">
            <div className="mx-auto max-w-6xl px-4 py-2 text-sm">{flash.message}</div>
          </div>
        )}

        <main className="flex-1 pt-0">
          <Outlet />
        </main>

        <footer className="px-6 py-6 text-center text-sm text-gray-500">
          <Link to="/about" className="underline">About</Link>
        </footer>
      </div>
    </div>
  );
}










