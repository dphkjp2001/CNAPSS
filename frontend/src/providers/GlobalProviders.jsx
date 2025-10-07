import React from "react";
// Use your uploaded contexts as providers.
import { AuthProvider } from "../contexts/AuthContext.jsx";
import { SchoolProvider } from "../contexts/SchoolContext.jsx";
import { SocketProvider } from "../contexts/SocketContext.jsx";
// This file name is from your upload; it likely exports a provider component.
import AuthGateProvider from "../contexts/AuthGateProvider.jsx";

export default function GlobalProviders({ children }) {
  return (
    <AuthProvider>
      <SchoolProvider>
        <AuthGateProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthGateProvider>
      </SchoolProvider>
    </AuthProvider>
  );
}
