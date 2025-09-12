// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import {
  getMaterial,
  getPublicMaterial,       // ✅ NEW
  checkMaterialRequest,
  sendMaterialRequest,
} from "../../api/materials";
import { useLoginGate } from "../../hooks/useLoginGate"; // ✅ NEW

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
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const { ensureAuth } = useLoginGate();   // ✅

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

  // ✅ 상세 로딩: 토큰 있으면 보호, 없으면 공개
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

  // 요청 중복 체크: 로그인 상태에서만 호출(비로그인은 패스)
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

  // ✅ Send: 클릭 시점에만 로그인 유도
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
  const meta1 = [mat.courseCode, mat.semester, mat.professor ? `Prof. ${mat.professor}` : null]
    .filter(Boolean)
    .join(" • ");
  const meta2 = [
    (mat.listingType ? (mat.listingType === "wanted" ? "Wanted" : "For Sale") : null),
    mat.kind ? `${mat.kind}` : null,
    mat.materialType ? `${mat.materialType}` : null,
    mat.sharePreference ? `${mat.sharePreference}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const hasOfferings = Array.isArray(mat.offerings) && mat.offerings.length > 0;

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-white">
            Back
          </button>
          {isOwner && (
            <span className="rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold text-white">
              Your posting
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{mat.title || mat.courseCode}</h1>
                <div className="mt-1 text-sm text-gray-600">{meta1}</div>
                {meta2 && <div className="mt-1 text-xs text-gray-500">{meta2}</div>}

                {mat.regarding && (
                  <div className="mt-2 text-sm text-gray-800">
                    <span className="font-medium">Regarding:</span> {mat.regarding}
                  </div>
                )}

                {hasOfferings && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mat.offerings.map((o) => (
                      <span
                        key={o}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {OFFERING_LABEL[o] || o}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 rounded-xl bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white">
                {priceText}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3 sm:p-6">
            {/* Left – info / guidelines */}
            <div className="sm:col-span-2 space-y-4">
              <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-800">
                <div className="mb-1 font-medium text-gray-900">Before you trade</div>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  <li>Only personal class notes/materials are allowed.</li>
                  <li>Do not share or sell copyrighted materials (e.g., full syllabus PDFs).</li>
                  <li>
                    Discuss delivery (in person / online) via chat after{" "}
                    {isWanted ? "fulfilling this request" : "sending a request"}.
                  </li>
                </ul>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 p-4 text-sm">
                <div className="text-gray-500">Posted by</div>
                <div className="mt-0.5 font-medium text-gray-900">{mat.authorName || "Unknown"}</div>
                <div className="mt-2 text-xs text-gray-400">{new Date(mat.createdAt).toLocaleString()}</div>
              </div>

              {/* Contact box (only non-owner) */}
              {!isOwner && (
                <div className="rounded-xl border border-gray-200 p-4 text-sm">
                  <div className="mb-2 font-medium text-gray-900">
                    {isWanted ? "Fulfill this request" : "Contact the uploader"}
                  </div>

                  {/* Already sent */}
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
                      {/* 비로그인도 자유롭게 입력 가능 */}
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                          isWanted ? "Offer your note/material…" : "Say hello and ask about the material…"
                        }
                        className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
                        disabled={checking || sending}
                      />
                      <button
                        onClick={handleSend}  // ✅ 클릭 시점에 로그인 유도
                        disabled={checking || sending || !message.trim()}
                        className={
                          "w-full rounded-lg px-3 py-2 text-sm font-semibold text-white " +
                          (checking || sending || !message.trim()
                            ? "bg-gray-400"
                            : isWanted
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-purple-600 hover:bg-purple-700")
                        }
                      >
                        {sending ? (isWanted ? "Offering…" : "Sending…") : isWanted ? "Fulfill" : "Send"}
                      </button>
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













