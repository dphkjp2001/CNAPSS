import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingSchoolSelect from "../pages/Landing/LandingSchoolSelect.jsx";
import DashboardPage from "../features/dashboard/Dashboard.jsx";
import MessagesPage from "../features/messages/MessagesPage.jsx";
import RequireAuth from "../gates/RequireAuth.jsx";

// Small layout for protected sections (header/footer can be added later)
function ProtectedLayout({ children }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

export default function RoutesConfig() {
  return (
    <Routes>
      <Route path="/" element={<LandingSchoolSelect />} />
      <Route
        path="/:school/dashboard/*"
        element={
          <RequireAuth>
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/:school/messages"
        element={
          <RequireAuth>
            <ProtectedLayout>
              <MessagesPage />
            </ProtectedLayout>
          </RequireAuth>
        }
      />
      {/* Default */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
