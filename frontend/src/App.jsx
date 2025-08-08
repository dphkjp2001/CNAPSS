// 📁 파일 경로: frontend/src/App.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";

import Splash from "./pages/Splash";
import SchoolSelect from "./pages/SchoolSelect";
import About from "./pages/About";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthRequired from "./pages/auth/AuthRequired";

import Dashboard from "./pages/dashboard/Dashboard";
import MyPosts from "./pages/dashboard/MyPosts";
import LikedPosts from "./pages/dashboard/LikedPosts";
import CommentedPosts from "./pages/dashboard/CommentedPosts";

import FreeBoardList from "./pages/freeboard/FreeBoardList";
import FreeBoardWrite from "./pages/freeboard/FreeBoardWrite";
import FreeBoardDetail from "./pages/freeboard/FreeBoardDetail";
import FreeBoardEdit from "./pages/freeboard/FreeBoardEdit";

import MarketList from "./pages/market/MarketList";
import MarketWrite from "./pages/market/MarketWrite";
import MarketDetail from "./pages/market/MarketDetail";
import MarketEdit from "./pages/market/MarketEdit";

import Messages from "./pages/messages/Messages";
import RequireAuth from "./components/RequireAuth";

import PersonalSchedule from "./pages/schedule/PersonalSchedule";
import GroupAvailability from "./pages/schedule/GroupAvailability";

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Splash />} />
        <Route path="/select-school" element={<SchoolSelect />} />
        <Route path="/about" element={<About />} />
      </Route>

      <Route element={<Layout />}>
        {/* ✅ 인증 관련 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth-required" element={<AuthRequired />} />

        {/* ✅ 인증 완료 사용자 영역 */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* ✅ 자유 게시판 */}
        <Route path="/freeboard" element={<FreeBoardList />} />
        <Route
          path="/freeboard/write"
          element={
            <RequireAuth>
              <FreeBoardWrite />
            </RequireAuth>
          }
        />
        <Route
          path="/freeboard/edit/:id"
          element={
            <RequireAuth>
              <FreeBoardEdit />
            </RequireAuth>
          }
        />
        <Route
          path="/freeboard/:id"
          element={
            <RequireAuth>
              <FreeBoardDetail />
            </RequireAuth>
          }
        />

        {/* ✅ 대시보드 하위 */}
        <Route
          path="/myposts"
          element={
            <RequireAuth>
              <MyPosts />
            </RequireAuth>
          }
        />
        <Route
          path="/liked"
          element={
            <RequireAuth>
              <LikedPosts />
            </RequireAuth>
          }
        />
        <Route
          path="/commented"
          element={
            <RequireAuth>
              <CommentedPosts />
            </RequireAuth>
          }
        />

        {/* ✅ 마켓 */}
        <Route path="/market" element={<MarketList />} />
        <Route
          path="/market/write"
          element={
            <RequireAuth>
              <MarketWrite />
            </RequireAuth>
          }
        />
        <Route path="/market/:id" element={<MarketDetail />} />
        <Route
          path="/market/:id/edit"
          element={
            <RequireAuth>
              <MarketEdit />
            </RequireAuth>
          }
        />

        {/* ✅ 채팅 */}
        <Route
          path="/messages"
          element={
            <RequireAuth>
              <Messages />
            </RequireAuth>
          }
        />

        {/* ✅ 시간표 */}
        <Route
          path="/personal-schedule"
          element={
            <RequireAuth>
              <PersonalSchedule />
            </RequireAuth>
          }
        />
        <Route
          path="/group-availability"
          element={
            <RequireAuth>
              <GroupAvailability />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;

