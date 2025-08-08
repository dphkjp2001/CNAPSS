// src/components/PublicLayout.jsx
import { Outlet, Link } from "react-router-dom";
import React from "react";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 메인 콘텐츠 */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 하단 footer만 유지 */}
      <footer className="px-6 py-4 text-center text-sm text-gray-500 border-t">
        <Link to="/about" className="mr-4 underline">About</Link>
      </footer>
    </div>
  );
}
