// frontend/src/contexts/AuthGateProvider.jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { subscribeGate, closeGate as busClose } from "../utils/gateBus";
import { useAuth } from "./AuthContext";

export const AuthGateContext = createContext({ open: false, from: "/", close: () => {} });

export default function AuthGateProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("/");
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user } = useAuth();

  const close = useCallback(() => setOpen(false), []);

  // Listen for "openGate" / "closeGate"
  useEffect(() => {
    const unsub = subscribeGate((evt) => {
      if (evt.type === "open") {
        setFrom(evt.from || `${pathname}${search || ""}`);
        setOpen(true);
      } else if (evt.type === "close") {
        setOpen(false);
      }
    });
    return unsub;
  }, [pathname, search]);

  // If user logs in while modal is open, close it.
  useEffect(() => {
    if (user && open) setOpen(false);
  }, [user, open]);

  // ✅ 이동한 경로가 /login or /register 이면 모달 자동 닫기
  useEffect(() => {
    if (open && /^\/(login|register)(\/|$)/.test(pathname)) {
      setOpen(false);
    }
  }, [open, pathname]);

  const goLogin = () => {
    setOpen(false);            // ✅ 먼저 닫고
    busClose();
    navigate("/login", { state: { from } });
  };
  const goRegister = () => {
    setOpen(false);            // ✅ 먼저 닫고
    busClose();
    navigate("/register", { state: { from } });
  };

  const ctx = useMemo(() => ({ open, from, close }), [open, from, close]);

  return (
    <AuthGateContext.Provider value={ctx}>
      {children}

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
          style={{ zIndex: 1000 }} // ensure on top in any build
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-1 text-gray-900">Login required</h3>
            <p className="text-sm text-gray-600 mb-5">
              Please log in or sign up to use this feature. You’ll return to your previous page.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="px-4 py-2 rounded-xl text-white bg-blue-600" onClick={goLogin}>
                Log In
              </button>
              <button className="px-4 py-2 rounded-xl text-white bg-gray-700" onClick={goRegister}>
                Sign Up
              </button>
            </div>
            <button
              className="mt-3 text-xs text-gray-500 block mx-auto"
              onClick={() => {
                busClose();
                close();
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </AuthGateContext.Provider>
  );
}

