// 📁 frontend/src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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
import AuthRequired from "./pages/auth/AuthRequired"; // kept for compatibility

// 수업관련 자료 관련 페이지
import CourseBrowser from "./pages/courses/CourseBrowser";
import CourseMaterials from "./pages/courses/CourseMaterials";
import UploadMaterial from "./pages/courses/UploadMaterial";


// Lazy pages
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const MyPosts = lazy(() => import("./pages/dashboard/MyPosts"));
const LikedPosts = lazy(() => import("./pages/dashboard/LikedPosts"));
const CommentedPosts = lazy(() => import("./pages/dashboard/CommentedPosts"));

const FreeBoardList = lazy(() => import("./pages/freeboard/FreeBoardList"));
const FreeBoardWrite = lazy(() => import("./pages/freeboard/FreeBoardWrite"));
const FreeBoardDetail = lazy(() => import("./pages/freeboard/FreeBoardDetail"));
const FreeBoardEdit = lazy(() => import("./pages/freeboard/FreeBoardEdit"));

const MarketList = lazy(() => import("./pages/market/MarketList"));
const MarketWrite = lazy(() => import("./pages/market/MarketWrite"));
const MarketDetail = lazy(() => import("./pages/market/MarketDetail"));
const MarketEdit = lazy(() => import("./pages/market/MarketEdit"));

const Messages = lazy(() => import("./pages/messages/Messages"));
const PersonalSchedule = lazy(() => import("./pages/schedule/PersonalSchedule"));
const GroupAvailability = lazy(() => import("./pages/schedule/GroupAvailability"));
const FoodMap = lazy(() => import("./pages/food/FoodMap"));

/** NormalizeDashboard: fix old/invalid dashboard links */
function NormalizeDashboard() {
  const { user } = useAuth();
  if (user?.school) return <Navigate to={`/${user.school}/dashboard`} replace />;
  return <Navigate to="/select-school" replace />;
}

function App() {
  return (
    <AuthGateProvider>
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
        <Routes>
          {/* Public (no school scope) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Splash />} />
            <Route path="/select-school" element={<SchoolSelect />} />
            <Route path="/about" element={<About />} />
          </Route>

          {/* Auth pages (unscoped) */}
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:school" element={<Register />} />
            <Route path="/auth-required" element={<AuthRequired />} />
          </Route>

          {/* Normalize odd paths */}
          <Route path="/dashboard/*" element={<NormalizeDashboard />} />
          <Route path="//dashboard/*" element={<NormalizeDashboard />} />

          {/* School-scoped */}
          <Route path="/:school" element={<Layout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* FreeBoard: list is public (read-only); detail/write/edit require auth */}
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
                  <FreeBoardEdit />
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

            {/* ✅ Market: lock everything behind auth */}
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

            {/* Food Map (protected) */}
            <Route
              path="foodmap"
              element={
                <RequireAuth>
                  <FoodMap />
                </RequireAuth>
              }
            />
          </Route>

          <Route
            path="/:school/courses"
            element={
              <RequireAuth>
                <CourseBrowser />
              </RequireAuth>
            }
          />
          <Route
            path="/:school/courses/:courseId/materials"
            element={
              <RequireAuth>
                <CourseMaterials />
              </RequireAuth>
            }
          />
          <Route
            path="/:school/courses/upload"
            element={
              <RequireAuth>
                <UploadMaterial />
              </RequireAuth>
            }
          />
          <Route
            path="/:school/courses/:courseId/upload"
            element={
              <RequireAuth>
                <UploadMaterial />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/select-school" replace />} />
        </Routes>
      </Suspense>
    </AuthGateProvider>
  );
}

export default App;






