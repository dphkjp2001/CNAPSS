// src/components/PublicLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PublicLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top (simple) */}
      <header className="w-full border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="font-bold text-xl">
            CNAPSS
          </Link>

          <nav className="flex items-center gap-1">
            {user?.email ? (
              <>
                {/* 로그인 상태: 대시보드로 바로 이동 + 로그아웃 */}
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
                {/* 비로그인: 로그인/회원가입 노출 */}
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
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-gray-500 border-t">
        <Link to="/about" className="mr-4 underline">
          About
        </Link>
      </footer>
    </div>
  );
}

