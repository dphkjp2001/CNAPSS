// frontend/src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";
import AuthGateProvider from "./contexts/AuthGateProvider";

// Top-level pages
import SchoolSelect from "./pages/SchoolSelect";
import About from "./pages/About";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthRequired from "./pages/auth/AuthRequired";

// Reviews (RMP etc.)
import CourseDetail from "./pages/courses/CourseDetail";
import ProfessorDetail from "./pages/courses/ProfessorDetail";
import ReviewsHub from "./pages/reviews/ReviewsHub";

// Dashboards (lazy)
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const MyPosts = lazy(() => import("./pages/dashboard/MyPosts"));
const LikedPosts = lazy(() => import("./pages/dashboard/LikedPosts"));
const CommentedPosts = lazy(() => import("./pages/dashboard/CommentedPosts"));

// Details (lazy)
const FreeBoardDetail = lazy(() => import("./pages/freeboard/FreeBoardDetail"));
const AcademicDetail = lazy(() => import("./pages/academic/AcademicDetail"));

// Other feature pages (lazy)
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

/** Back-compat: /:school/career/:id → /:school/academic/:id */
function CareerToAcademic() {
  const { school, id } = useParams();
  return <Navigate to={`/${school}/academic/${id}`} replace />;
}

export default function App() {
  return (
    <AuthGateProvider>
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
        <Routes>
          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<SchoolSelect />} />
            <Route path="/select-school" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<RegisterRoute />} />
            <Route path="/register/:school" element={<RegisterRoute />} />
            <Route path="/auth-required" element={<AuthRequired />} />
          </Route>

          {/* Normalize */}
          <Route path="/dashboard/*" element={<NormalizeDashboard />} />

          {/* School-scoped */}
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

            {/* Back-compat: remove list pages; redirect to tabs */}
            <Route path="freeboard" element={<Navigate to="../dashboard?tab=free" replace />} />
            <Route path="career" element={<Navigate to="../dashboard?tab=academic" replace />} />

            {/* Details */}
            <Route path="freeboard/:id" element={<FreeBoardDetail />} />
            <Route path="academic/:id" element={<AcademicDetail />} />
            {/* Back-compat for old academic detail path */}
            <Route path="career/:id" element={<CareerToAcademic />} />

            {/* Reviews (keep) */}
            <Route path="reviews" element={<ReviewsHub />} />
            <Route path="courses/:courseId" element={<CourseDetail />} />
            <Route path="professors/:professorId" element={<ProfessorDetail />} />

            {/* Protected */}
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

            {/* Messages / Schedule / Food */}
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
            <Route path="foodmap" element={<FoodMap />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthGateProvider>
  );
}






























