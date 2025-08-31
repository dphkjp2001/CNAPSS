// frontend/src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";
import AuthGateProvider from "./contexts/AuthGateProvider";

import Splash from "./pages/Splash";
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

function NormalizeDashboard() {
  const { user } = useAuth();
  if (user?.school) return <Navigate to={`/${user.school}/dashboard`} replace />;
  return <Navigate to="/select-school" replace />;
}

function EditToDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`../freeboard/${id}`} replace />;
}

// 과거 코스별 폴더 경로 → 메인 리스트로 리다이렉트
function LegacyCourseMaterialsRedirect() {
  const { school } = useParams();
  return <Navigate to={`/${school}/courses`} replace />;
}

export default function App() {
  return (
    <AuthGateProvider>
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
        <Routes>
          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Splash />} />
            <Route path="/select-school" element={<SchoolSelect />} />
            <Route path="/about" element={<About />} />
          </Route>

          {/* Auth (unscoped) */}
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:school" element={<Register />} />
            <Route path="/auth-required" element={<AuthRequired />} />
          </Route>

          {/* Normalize */}
          <Route path="/dashboard/*" element={<NormalizeDashboard />} />
          <Route path="//dashboard/*" element={<NormalizeDashboard />} />

          {/* School-scoped (모든 학교별 페이지는 Layout 아래) */}
          <Route path="/:school" element={<Layout />}>
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
            <Route
              path="market"
              element={
                <RequireAuth>
                  <MarketList />
                </RequireAuth>
              }
            />
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

            {/* Messages (이미 Layout 아래) */}
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

            {/* ✅ CourseHub — Layout 아래로 이동 */}
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
            {/* 옛날 경로 지원 */}
            <Route path="courses/:courseId/materials" element={<LegacyCourseMaterialsRedirect />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/select-school" replace />} />
        </Routes>
      </Suspense>
    </AuthGateProvider>
  );
}










