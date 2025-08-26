// frontend/src/hooks/useLoginGate.js
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { openGate } from "../utils/gateBus";

export function useLoginGate() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const from = `${pathname}${search || ""}`;

  function ensureAuth(actionIfAuthed) {
    if (user) return actionIfAuthed?.();
    openGate(from); // 🔥 open modal
  }

  return { ensureAuth, isAuthed: !!user };
}
