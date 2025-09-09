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

// CourseHub
import Courses from "./pages/courses/Courses.jsx";
import CourseWrite from "./pages/courses/CourseWrite";
import MaterialDetail from "./pages/courses/MaterialDetail";

const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const MyPosts = lazy(() => import("./pages/dashboard/MyPosts"));
const LikedPosts = lazy(() => import("./pages/dashboard/LikedPosts"));
const CommentedPosts = lazy(() => import("./pages/dashboard/CommentedPosts"));

const FreeBoardList = lazy(() => import("./pages/freeboard/FreeBoardList"));
const FreeBoardWrite = lazy(() => import("./pages/freeboard/FreeBoardWrite"));
const FreeBoardDetail = lazy(() => import("./pages/freeboard/FreeBoardDetail"));

const MarketList = lazy(() => import("./pages/market/MarketList"));
const MarketWrite = lazy(() => import("./pages/market/MarketWrite"));
const MarketDetail = lazy(() => import("./pages/market/MarketDetail"));
const MarketEdit = lazy(() => import("./pages/market/MarketEdit"));

const Messages = lazy(() => import("./pages/messages/Messages"));
const PersonalSchedule = lazy(() => import("./pages/schedule/PersonalSchedule"));
const GroupAvailability = lazy(() => import("./pages/schedule/GroupAvailability"));
const FoodMap = lazy(() => import("./pages/food/FoodMap"));

const ENABLED_SCHOOLS = new Set(["nyu"]);

function NormalizeDashboard() {
  const { user } = useAuth();
  if (user?.school) return <Navigate to={`/${user.school}/dashboard`} replace />;
  return <Navigate to="/" replace />;
}

function EditToDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`../freeboard/${id}`} replace />;
}

function LegacyCourseMaterialsRedirect() {
  const { school } = useParams();
  return <Navigate to={`/${school}/courses`} replace />;
}

/** 로그인/회원가입 라우트 가드: 이미 로그인 → 자신의 대시보드로 */
function LoginRoute() {
  const { user } = useAuth();
  return user?.school ? <Navigate to={`/${user.school}/dashboard`} replace /> : <Login />;
}
function RegisterRoute() {
  const { user } = useAuth();
  return user?.school ? <Navigate to={`/${user.school}/dashboard`} replace /> : <Register />;
}

/** ✅ School whitelist gate (NYU only) */
function SchoolGate({ children }) {
  const { school } = useParams();
  if (!ENABLED_SCHOOLS.has((school || "").toLowerCase())) {
    const label =
      school?.toLowerCase() === "columbia"
        ? "Columbia"
        : school?.toLowerCase() === "boston"
        ? "Boston"
        : school;
    return (
      <Navigate
        to="/"
        replace
        state={{ flash: { type: "info", message: `${label || "This school"} is coming soon 🚧` } }}
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
          {/* Public (no auth) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<SchoolSelect />} />
            <Route path="/select-school" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<About />} />

            {/* Auth (public look) */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<RegisterRoute />} />
            <Route path="/register/:school" element={<RegisterRoute />} />
            <Route path="/auth-required" element={<AuthRequired />} />
          </Route>

          {/* Normalize */}
          <Route path="/dashboard/*" element={<NormalizeDashboard />} />

          {/* School-scoped (NYU only) */}
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

            {/* FreeBoard */}
            <Route path="freeboard" element={<FreeBoardList />} />
            <Route
              path="freeboard/:id"
              element={
                <RequireAuth>
                  <FreeBoardDetail />
                </RequireAuth>
              }
            />
            <Route
              path="freeboard/write"
              element={
                <RequireAuth>
                  <FreeBoardWrite />
                </RequireAuth>
              }
            />
            <Route
              path="freeboard/edit/:id"
              element={
                <RequireAuth>
                  <EditToDetailRedirect />
                </RequireAuth>
              }
            />

            {/* Dashboard sub-pages */}
            <Route
              path="myposts"
              element={
                <RequireAuth>
                  <MyPosts />
                </RequireAuth>
              }
            />
            <Route
              path="liked"
              element={
                <RequireAuth>
                  <LikedPosts />
                </RequireAuth>
              }
            />
            <Route
              path="commented"
              element={
                <RequireAuth>
                  <CommentedPosts />
                </RequireAuth>
              }
            />

            {/* Market */}
            {/* ✅ List is now PUBLIC */}
            <Route path="market" element={<MarketList />} />
            {/* Detail / Write / Edit remain protected */}
            <Route
              path="market/:id"
              element={
                <RequireAuth>
                  <MarketDetail />
                </RequireAuth>
              }
            />
            <Route
              path="market/write"
              element={
                <RequireAuth>
                  <MarketWrite />
                </RequireAuth>
              }
            />
            <Route
              path="market/:id/edit"
              element={
                <RequireAuth>
                  <MarketEdit />
                </RequireAuth>
              }
            />

            {/* Messages */}
            <Route
              path="messages"
              element={
                <RequireAuth>
                  <Messages />
                </RequireAuth>
              }
            />

            {/* Schedule */}
            <Route
              path="personal-schedule"
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

            {/* FoodMap */}
            <Route
              path="foodmap"
              element={
                <RequireAuth>
                  <FoodMap />
                </RequireAuth>
              }
            />

            {/* CourseHub */}
            <Route
              path="courses"
              element={
                <RequireAuth>
                  <Courses />
                </RequireAuth>
              }
            />
            <Route
              path="courses/write"
              element={
                <RequireAuth>
                  <CourseWrite />
                </RequireAuth>
              }
            />
            <Route
              path="courses/materials/:id"
              element={
                <RequireAuth>
                  <MaterialDetail />
                </RequireAuth>
              }
            />
            <Route path="courses/:courseId/materials" element={<LegacyCourseMaterialsRedirect />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthGateProvider>
  );
}















