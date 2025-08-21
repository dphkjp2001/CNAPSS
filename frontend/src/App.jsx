// frontend/src/App.jsx

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";

import Splash from "./pages/Splash";
import SchoolSelect from "./pages/SchoolSelect";
import About from "./pages/About";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthRequired from "./pages/auth/AuthRequired";

// ✅ 라우트별 지연 로딩
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

// ✅ FoodMap도 lazy
const FoodMap = lazy(() => import("./pages/food/FoodMap"));

function App() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Splash />} />
          <Route path="/select-school" element={<SchoolSelect />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth-required" element={<AuthRequired />} />

          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />

          <Route path="/freeboard" element={<FreeBoardList />} />
          <Route path="/freeboard/write" element={<RequireAuth><FreeBoardWrite /></RequireAuth>} />
          <Route path="/freeboard/edit/:id" element={<RequireAuth><FreeBoardEdit /></RequireAuth>} />
          <Route path="/freeboard/:id" element={<RequireAuth><FreeBoardDetail /></RequireAuth>} />

          <Route path="/myposts" element={<RequireAuth><MyPosts /></RequireAuth>} />
          <Route path="/liked" element={<RequireAuth><LikedPosts /></RequireAuth>} />
          <Route path="/commented" element={<RequireAuth><CommentedPosts /></RequireAuth>} />

          <Route path="/market" element={<MarketList />} />
          <Route path="/market/write" element={<RequireAuth><MarketWrite /></RequireAuth>} />
          <Route path="/market/:id" element={<MarketDetail />} />
          <Route path="/market/:id/edit" element={<RequireAuth><MarketEdit /></RequireAuth>} />

          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />

          <Route path="/personal-schedule" element={<RequireAuth><PersonalSchedule /></RequireAuth>} />
          <Route path="/group-availability" element={<RequireAuth><GroupAvailability /></RequireAuth>} />

          <Route path="/foodmap" element={<RequireAuth><FoodMap /></RequireAuth>} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
export default App;
