// frontend/src/components/RequestOfferPanel.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRequest } from "../api/request";
import { useAuth } from "../contexts/AuthContext";

function Radio({ label, value, selected, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="radio"
        className="h-4 w-4 accent-red-500"
        checked={selected === value}
        onChange={() => onChange(value)}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

export default function RequestOfferPanel({ school, postId, kind }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isCourseMaterials = kind === "course_materials";
  const isCoffeeChat = kind === "coffee_chat";
  const isStudyMate = kind === "study_mate" || kind === "study_group";

  // --- Fixed message for Study Buddy (request) ---
  const FIXED_STUDY_BUDDY_MSG =
    "Hi,\nI would love to study with!\nLet me know what days are you thinking of :)";

  // defaults
  const [option, setOption] = useState("lunch");
  const [message, setMessage] = useState("");

  // Compose preview text based on kind/option
  const preview = useMemo(() => {
    if (isStudyMate) {
      // 🔒 fixed text (non-editable)
      return FIXED_STUDY_BUDDY_MSG;
    }
    if (isCourseMaterials) {
      const suffix =
        option === "lunch"
          ? "lunch/dinner"
          : option === "small"
          ? "a small cost"
          : "anything is fine";
      return `Hi,\nI have the class materials you're looking for. You can get it by ${suffix}.`;
    }
    if (isCoffeeChat) {
      const suffix =
        option === "lunch"
          ? "lunch/dinner"
          : option === "small"
          ? "a small cost"
          : "anything is fine";
      return `Hi,\nI can have a coffee chat with you by ${suffix}.`;
    }
    return message || "";
  }, [isCourseMaterials, isCoffeeChat, isStudyMate, message, option]);

  const [sending, setSending] = useState(false);
  const canSend = !!postId && !!school && preview.trim().length > 0;

  const onSend = async () => {
    if (!user) {
      alert("Please log in to send a message.");
      return;
    }
    try {
      setSending(true);
      const res = await createRequest({
        school,
        targetId: postId,
        // Study buddy는 고정 문구를 강제로 사용
        message: isStudyMate ? FIXED_STUDY_BUDDY_MSG : preview,
      });
      const convId = res?.conversationId;
      if (convId) {
        navigate(`/${encodeURIComponent(school)}/messages?c=${encodeURIComponent(convId)}`);
      } else {
        navigate(`/${encodeURIComponent(school)}/messages`);
      }
    } catch (e) {
      alert(e?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="bg-white rounded-2xl shadow border border-slate-200 p-4 h-max">
      <div className="text-sm text-slate-900 font-semibold mb-1">Hi,</div>
      <div className="text-sm text-slate-700 mb-3">
        {isCourseMaterials && "I have the class materials you're looking for. You can get it by"}
        {isCoffeeChat && "I can have a coffee chat with you by"}
        {isStudyMate && "Send a request message:"}
      </div>

      {/* Options (Study Material / Coffee Chat only) */}
      {(isCourseMaterials || isCoffeeChat) && (
        <div className="space-y-3 mb-4">
          <Radio label="lunch/dinner" value="lunch" selected={option} onChange={setOption} />
          <Radio label="small cost" value="small" selected={option} onChange={setOption} />
          <Radio label="Anything is fine" value="free" selected={option} onChange={setOption} />
        </div>
      )}

      {/* Study Buddy: textarea 제거(고정 문구) */}
      {!isStudyMate && !(isCourseMaterials || isCoffeeChat) && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-4"
          placeholder="Write a short message…"
        />
      )}

      {/* Preview (always visible) */}
      <div className="mb-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs whitespace-pre-wrap text-slate-700">
        {preview}
      </div>

      <button
        onClick={onSend}
        disabled={sending || !canSend}
        className="w-full rounded-xl bg-red-500 text-white font-semibold py-2 shadow hover:bg-red-600 disabled:opacity-60"
      >
        {isStudyMate ? (sending ? "Sending…" : "Send a request") : (sending ? "Sending…" : "Send an offer")}
      </button>
    </aside>
  );
}

