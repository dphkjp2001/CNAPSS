// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import {
  getMaterial,
  getPublicMaterial,
  checkMaterialRequest,
  sendMaterialRequest,
} from "../../api/materials";
import { useLoginGate } from "../../hooks/useLoginGate";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const OFFERING_LABEL = {
  syllabus: "Syllabus",
  exam: "Exams",
  general: "General course content",
  other: "Others",
};

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { ensureAuth } = useLoginGate();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [mat, setMat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // request/chat states
  const [checking, setChecking] = useState(true);
  const [alreadySent, setAlreadySent] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const isOwner = useMemo(
    () =>
      !!(user?.email && mat?.uploaderEmail) &&
      user.email.toLowerCase() === String(mat.uploaderEmail).toLowerCase(),
    [user, mat]
  );

  const isWanted = (mat?.listingType || "sale") === "wanted";

  // load detail (public if no token)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = token
          ? await getMaterial({ school, token, id })
          : await getPublicMaterial({ school, id });
        if (!alive) return;
        setMat(data);
      } catch {
        if (alive) setErr("Failed to load the listing.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token, id]);

  // check existing request (only when logged in & not owner)
  useEffect(() => {
    if (!token || !mat || isOwner) {
      setChecking(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const s = await checkMaterialRequest({
          school,
          token,
          materialId: id,
          reqType: isWanted ? "coursehub_wtb" : "coursehub",
        });
        if (!alive) return;
        setAlreadySent(!!s?.alreadySent);
        setConversationId(s?.conversationId || null);
      } catch {
        // ignore
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mat, isOwner, school, token, id, isWanted]);

  const handleSend = () => {
    const text = String(message || "").trim();
    if (!text) return alert("Please enter a message.");
    ensureAuth(async () => {
      try {
        setSending(true);
        const res = await sendMaterialRequest({
          school,
          token,
          materialId: id,
          message: text,
          reqType: isWanted ? "coursehub_wtb" : "coursehub",
        });
        setAlreadySent(true);
        setConversationId(res?.conversationId || null);
        setMessage("");
      } catch (e) {
        console.error(e);
        alert(e?.message || "Failed to send request.");
      } finally {
        setSending(false);
      }
    });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        Loading…
      </div>
    );
  }

  if (err || !mat) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        {err || "Not found."}
      </div>
    );
  }

  const priceText = mat.isFree ? "Free" : currency.format(Number(mat.price || 0));
  const headerTitle = [mat.courseCode, mat.courseTitle].filter(Boolean).join(" — ");
  const metaLine = [mat.semester, mat.professor ? `Prof. ${mat.professor}` : null]
    .filter(Boolean)
    .join(" • ");
  const hasOfferings = Array.isArray(mat.offerings) && mat.offerings.length > 0;

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}>
      <div className="mx-auto max-w-6xl">
        {/* top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back
          </button>
          {isOwner && (
            <span className="rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold text-white">
              Your posting
            </span>
          )}
        </div>

        {/* card */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {/* header */}
          <div className="border-b border-gray-100 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-extrabold tracking-tight text-gray-900">
                  {headerTitle || mat.title || mat.courseCode}
                </h1>
                {metaLine && <div className="mt-2 text-sm text-gray-600">{metaLine}</div>}
                {mat.regarding && (
                  <div className="mt-3 text-sm text-gray-800">
                    <span className="font-medium">Regarding:</span> {mat.regarding}
                  </div>
                )}
                {hasOfferings && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mat.offerings.map((o) => (
                      <span
                        key={o}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                      >
                        {OFFERING_LABEL[o] || o}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 rounded-2xl bg-gray-900 px-4 py-2 text-base font-bold text-white">
                {priceText}
              </div>
            </div>
          </div>

          {/* body */}
          <div className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-3 sm:p-8">
            {/* left */}
            <div className="sm:col-span-2 space-y-5">
              <div className="rounded-2xl border border-gray-200 p-5 text-sm text-gray-800">
                <div className="mb-2 text-base font-semibold text-gray-900">Before you trade</div>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Only personal class notes/materials are allowed.</li>
                  <li>Do not share or sell copyrighted materials (e.g., full syllabus PDFs).</li>
                  <li>
                    Discuss delivery (in person / online) via chat after{" "}
                    {isWanted ? "fulfilling this request" : "sending a request"}.
                  </li>
                </ul>
              </div>

              {mat.description ? (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="mb-2 text-base font-semibold text-gray-900">Description</div>
                  <div className="whitespace-pre-wrap text-sm text-gray-800">{mat.description}</div>
                </div>
              ) : null}
            </div>

            {/* right */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 p-5 text-sm">
                <div className="text-gray-500">Posted by</div>
                <div className="mt-0.5 font-medium text-gray-900">{mat.authorName || "Unknown"}</div>
                <div className="mt-2 text-xs text-gray-400">
                  {mat.createdAt ? new Date(mat.createdAt).toLocaleString() : ""}
                </div>
              </div>

              {!isOwner && (
                <div className="rounded-2xl border border-gray-200 p-5 text-sm">
                  <div className="mb-2 font-semibold text-gray-900">
                    {isWanted ? "Fulfill this request" : "Contact the uploader"}
                  </div>

                  {token && alreadySent ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-green-700">
                        {isWanted ? "You have already offered." : "Request already sent."}
                      </div>
                      {conversationId && (
                        <button
                          onClick={() =>
                            navigate(
                              schoolPath(`messages`) +
                                (conversationId ? `?conversation=${conversationId}` : "")
                            )
                          }
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Open chat
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                          isWanted ? "Offer your note/material…" : "Say hello and ask about the material…"
                        }
                        className="mb-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        disabled={checking || sending}
                      />
                      <button
                        onClick={handleSend}
                        disabled={checking || sending || !message.trim()}
                        className={
                          "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow " +
                          (checking || sending || !message.trim()
                            ? "bg-gray-400"
                            : isWanted
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-purple-600 hover:bg-purple-700")
                        }
                      >
                        {sending ? (isWanted ? "Offering…" : "Sending…") : isWanted ? "Fulfill" : "Send"}
                      </button>
                      {!token && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          You can type freely. We’ll ask you to log in only when you press “Send”.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}















