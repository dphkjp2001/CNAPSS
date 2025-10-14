// frontend/src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";
import AuthGateProvider from "./contexts/AuthGateProvider";

import SchoolSelect from "./pages/SchoolSelect";
import About from "./pages/About";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthRequired from "./pages/auth/AuthRequired";

// Dashboard + Boards
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const FreeBoardDetail = lazy(() => import("./pages/freeboard/FreeBoardDetail"));
const AcademicDetail = lazy(() => import("./pages/academic/AcademicDetail")); // ✅ NEW

// Market + Messages
const MarketList = lazy(() => import("./pages/market/MarketList"));
const MarketWrite = lazy(() => import("./pages/market/MarketWrite"));
const MarketDetail = lazy(() => import("./pages/market/MarketDetail"));
const MarketEdit = lazy(() => import("./pages/market/MarketEdit"));
const Messages = lazy(() => import("./pages/messages/Messages"));

const PersonalSchedule = lazy(() => import("./pages/schedule/PersonalSchedule"));
const GroupAvailability = lazy(() => import("./pages/schedule/GroupAvailability"));

const ENABLED_SCHOOLS = new Set(["nyu"]);

function NormalizeDashboard() {
  const { user } = useAuth();
  if (user?.school) return <Navigate to={`/${user.school}/dashboard`} replace />;
  return <Navigate to="/" replace />;
}

function LoginRoute() {
  const { user } = useAuth();
  return user?.school ? <Navigate to={`/${user.school}/dashboard`} replace /> : <Login />;
}
function RegisterRoute() {
  const { user } = useAuth();
  return user?.school ? <Navigate to={`/${user.school}/dashboard`} replace /> : <Register />;
}

function SchoolGate({ children }) {
  const { school } = useParams();
  if (!ENABLED_SCHOOLS.has((school || "").toLowerCase())) {
    return (
      <Navigate
        to="/"
        replace
        state={{ flash: { type: "info", message: `${school || "This school"} is coming soon 🚧` } }}
      />
    );
  }
  return children;
}

export default function App() {
  return (
    <AuthGateProvider>
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
        <Routes>
          {/* ✅ 랜딩(학교 선택)만 fullBleed: 사이드바 제거 */}
          <Route element={<PublicLayout fullBleed />}>
            <Route path="/" element={<SchoolSelect />} />
          </Route>

          {/* 공개 페이지(사이드바 유지) */}
          <Route element={<PublicLayout />}>
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<RegisterRoute />} />
            <Route path="/auth-required" element={<AuthRequired />} />
          </Route>

          <Route path="/dashboard/*" element={<NormalizeDashboard />} />

          {/* 보호 레이아웃 (/:school) */}
          <Route
            path="/:school"
            element={
              <SchoolGate>
                <Layout />
              </SchoolGate>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Free & Academic boards (detail only) */}
            <Route path="freeboard/:id" element={<FreeBoardDetail />} />
            <Route path="academic/:id" element={<AcademicDetail />} />

            {/* Marketplace */}
            <Route path="market" element={<MarketList />} />
            <Route path="market/:id" element={<MarketDetail />} />
            <Route
              path="market/write"
              element={
                <RequireAuth>
                  <MarketWrite />
                </RequireAuth>
              }
            />
            <Route
              path="market/edit/:id"
              element={
                <RequireAuth>
                  <MarketEdit />
                </RequireAuth>
              }
            />

            {/* Protected pages */}
            <Route
              path="myposts"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="liked"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="commented"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="messages"
              element={
                <RequireAuth>
                  <Messages />
                </RequireAuth>
              }
            />
            <Route
              path="schedule"
              element={
                <RequireAuth>
                  <PersonalSchedule />
                </RequireAuth>
              }
            />
            <Route
              path="group-availability"
              element={
                <RequireAuth>
                  <GroupAvailability />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthGateProvider>
  );
}






























