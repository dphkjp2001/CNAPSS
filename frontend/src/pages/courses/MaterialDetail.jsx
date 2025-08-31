// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getMaterial } from "../../api/materials";
import { apiFetch } from "../../api/http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// pretty helpers
const prettyShare = (v) =>
  v === "in_person" ? "Prefer to share in person" : v === "online" ? "Prefer to share online" : "Doesn't matter";

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { school } = useSchool();
  const { token } = useAuth();
  const schoolPath = useSchoolPath();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  // 상태 조회용
  const [alreadySent, setAlreadySent] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // load data
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setFetchErr("");
        const res = await getMaterial({ school, token, id });
        if (!alive) return;
        setItem(res?.item || res);
      } catch {
        if (!alive) return;
        setFetchErr("This posting was not found.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [school, token, id]);

  // 👉 마운트 시 이미 보낸 적 있는지 확인
  useEffect(() => {
    if (!token || !school || !id) return;
    (async () => {
      try {
        const qs = new URLSearchParams({ type: "coursehub", targetId: id }).toString();
        const r = await apiFetch(`${API}/${encodeURIComponent(school)}/request/status?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const j = await r.json();
        setAlreadySent(!!j.alreadySent);
        if (j.conversationId) setConversationId(j.conversationId);
      } catch {}
    })();
  }, [token, school, id]);

  const titleLine = useMemo(() => {
    if (!item) return "";
    return item.courseTitle || item.courseCode || "Untitled";
  }, [item]);

  async function onSend() {
    setSendErr("");
    if (!token) return navigate("/auth-required");
    if (!message.trim()) {
      setSendErr("Please type your message.");
      return;
    }
    try {
      setSending(true);
      const body = {
        type: "coursehub",
        targetId: item?._id || id,
        message: message.trim(),
      };
      const res = await apiFetch(`${API}/${encodeURIComponent(school)}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await (async () => {
        try { return await res.json(); } catch { return {}; }
      })();

      if (res.status === 201) {
        // 성공 → 바로 채팅으로
        if (data.conversationId) {
          navigate(schoolPath(`/messages?conversation=${data.conversationId}`));
          return;
        }
        setAlreadySent(true);
        setConversationId(data.conversationId || null);
        setMessage("");
        return;
      }

      if (res.status === 409 && data.alreadySent) {
        // 이미 보냄 → 안내 박스로 전환
        setAlreadySent(true);
        if (data.conversationId) setConversationId(data.conversationId);
        setMessage("");
        return;
      }

      throw new Error("request failed");
    } catch (e) {
      setSendErr("Failed to send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl p-5">
          <div className="h-28 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-6 h-10 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (fetchErr || !item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl p-5">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back
          </button>
          <div className="rounded-2xl border bg-white p-4 text-sm text-red-600">
            {fetchErr || "This posting was not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-5">
        <div className="mb-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>

        {/* top card */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">{titleLine}</h1>
          {item.professor ? <div className="mt-1 text-sm text-gray-700">{item.professor}</div> : null}
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            {item.semester ? <div className="text-gray-700">{String(item.semester).replace("-", " ").toUpperCase()}</div> : null}
            <div>{item.materialType || "personal material"}</div>
            <div>
              {item.isFree ? "Free" : typeof item.price === "number" && item.price > 0 ? `$${item.price}` : "Price upon request"}
            </div>
            <div>{prettyShare(item.sharePreference)}</div>
          </div>
        </div>

        {/* request / already-sent box */}
        <div className="mt-8 rounded-2xl border bg-white p-4 shadow-sm">
          {alreadySent ? (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div>You’ve already sent a request.</div>
              <Link
                to={schoolPath(conversationId ? `/messages?conversation=${conversationId}` : "/messages")}
                className="font-medium text-blue-600 underline"
              >
                Go to Chat 💬
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-3 text-sm"
                  placeholder="문의 사항을 적어 주세요!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <button
                  onClick={onSend}
                  disabled={sending}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
              {sendErr ? <div className="mt-2 text-sm text-red-600">{sendErr}</div> : null}
            </>
          )}

          <div className="pointer-events-none mt-4 select-none text-[11px] leading-5 text-gray-500">
            Only personal notes and self-created materials are permitted. Official course materials,
            exams, and assignment solutions are not allowed. All exchanges are conducted solely
            between users. The platform is not responsible for any transactions, content accuracy, or
            disputes.
          </div>
        </div>
      </div>
    </div>
  );
}





