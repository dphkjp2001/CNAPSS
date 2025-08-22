// 📁 파일 경로: frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Restore from localStorage on init
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  });

  // Persist whenever user/token change
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  /**
   * login expects an object like:
   *   { user: { email, nickname, school, verified }, token: "..." }
   */
  const login = (payload) => {
    const normalizedUser = {
      email: payload?.user?.email,
      nickname: payload?.user?.nickname,
      school: payload?.user?.school,   // ✅ store school
      verified: payload?.user?.verified,
    };
    setUser(normalizedUser);
    if (payload?.token) setToken(payload.token);
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const value = { user, token, login, logout, setUser, setToken };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

