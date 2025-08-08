// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { SchoolProvider } from "./contexts/SchoolContext";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import { SocketProvider } from "./contexts/SocketContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SchoolProvider>
          <SocketProvider> {/* ✅ 여기 추가 */}
            <App />
          </SocketProvider>
        </SchoolProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);