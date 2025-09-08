// frontend/src/components/PublicLayout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const f = location.state?.flash;
    if (f) {
      setFlash(f);
      // drop history state (so it doesn't reappear on back/forward)
      try {
        const { pathname, search, hash } = window.location;
        window.history.replaceState({}, "", pathname + search + hash);
      } catch {}
      const t = setTimeout(() => setFlash(null), 3500);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top */}
      <header className="w-full bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="font-extrabold text-xl tracking-tight text-gray-900">
            CNAPSS
          </Link>

          <nav className="flex items-center gap-1">
            {user?.email ? (
              <>
                <Link
                  to={`/${encodeURIComponent(user.school || "")}/dashboard`}
                  className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md"
                >
                  Go to dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-violet-50 rounded-md"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* 🔔 flash banner */}
        {flash && (
          <div className="border-t bg-amber-50 text-amber-900">
            <div className="mx-auto max-w-6xl px-4 py-2 text-sm">{flash.message}</div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="px-6 py-6 text-center text-sm text-gray-500">
        <Link to="/about" className="underline">
          About
        </Link>
      </footer>
    </div>
  );
}






