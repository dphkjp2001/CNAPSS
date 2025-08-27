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

  // listen bus (with sticky replay)
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

  // if user logs in while modal is open, close it
  useEffect(() => {
    if (user && open) setOpen(false);
  }, [user, open]);

  // auth pages → auto close
  useEffect(() => {
    if (open && /^\/(login|register)(\/|$)/.test(pathname)) setOpen(false);
  }, [open, pathname]);

  const goLogin = () => {
    setOpen(false);
    busClose();
    navigate("/login", { state: { from } });
  };
  const goRegister = () => {
    setOpen(false);
    busClose();
    navigate("/register", { state: { from } });
  };

  // helper: extract school from a path like `/nyu/...`
  const extractSchool = (p) => {
    const m = /^\/([^/]+)/.exec(p || "");
    return m ? m[1] : null;
  };

  // Maybe later behavior:
  // - If we are currently on the same path that triggered the gate AND
  //   it's NOT the Free Board list, redirect to that school's dashboard.
  // - Otherwise just close the modal and stay.
  const onMaybeLater = () => {
    const here = pathname; // current location
    const trying = (from || here).split("?")[0];
    const samePlace = trying === here;
    const isFreeboardList = /^\/[^/]+\/freeboard\/?$/.test(here);

    busClose();
    setOpen(false);

    if (samePlace && !isFreeboardList) {
      const school = extractSchool(here) || extractSchool(trying) || extractSchool(from) || "";
      if (school) navigate(`/${school}/dashboard`, { replace: true });
      else navigate("/select-school", { replace: true });
    }
  };

  const ctx = useMemo(() => ({ open, from, close }), [open, from, close]);

  return (
    <AuthGateContext.Provider value={ctx}>
      {children}

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
          style={{ zIndex: 1000 }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">Login required</h3>
            <p className="mb-5 text-sm text-gray-600">
              Please log in or sign up to use this feature. You’ll return to your previous page.
            </p>

            <div className="flex justify-center gap-2">
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={goLogin}>
                Log In
              </button>
              <button className="rounded-xl bg-gray-700 px-4 py-2 text-white" onClick={goRegister}>
                Sign Up
              </button>
            </div>

            <button
              className="mx-auto mt-3 block text-xs text-gray-500"
              onClick={onMaybeLater}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </AuthGateContext.Provider>
  );
}


