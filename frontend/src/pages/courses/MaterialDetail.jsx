// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getMaterial, checkMaterialRequest, sendMaterialRequest } from "../../api/materials";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
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

  // load detail
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getMaterial({ school, token, id });
        if (!alive) return;
        setMat(data);
      } catch (e) {
        console.error(e);
        if (alive) setErr("Failed to load the listing.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token, id]);

  // check existing request (only if not owner)
  useEffect(() => {
    if (!mat || isOwner) {
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
        });
        if (!alive) return;
        setAlreadySent(!!s?.alreadySent);
        setConversationId(s?.conversationId || null);
      } catch (e) {
        console.warn("request status check failed:", e);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mat, isOwner, school, token, id]);

  const handleSend = async () => {
    const text = String(message || "").trim();
    if (!text) return alert("Please enter a message.");
    try {
      setSending(true);
      const res = await sendMaterialRequest({
        school,
        token,
        materialId: id,
        message: text,
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
  const meta1 = [
    mat.courseCode,
    mat.semester,
    mat.professor ? `Prof. ${mat.professor}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const meta2 = [
    mat.kind ? `${mat.kind}` : null,
    mat.materialType ? `${mat.materialType}` : null,
    mat.sharePreference ? `${mat.sharePreference}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-white"
          >
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {mat.title || mat.courseCode}
                </h1>
                <div className="mt-1 text-sm text-gray-600">{meta1}</div>
                {meta2 && <div className="mt-1 text-xs text-gray-500">{meta2}</div>}
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
                  <li>Discuss delivery (in person / online) via chat after sending a request.</li>
                </ul>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 p-4 text-sm">
                <div className="text-gray-500">Posted by</div>
                <div className="mt-0.5 font-medium text-gray-900">
                  {mat.authorName || "Unknown"}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {new Date(mat.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Contact box (only non-owner) */}
              {!isOwner && (
                <div className="rounded-xl border border-gray-200 p-4 text-sm">
                  <div className="mb-2 font-medium text-gray-900">Contact the uploader</div>

                  {/* Already sent */}
                  {alreadySent ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-green-700">Request already sent.</div>
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
                        placeholder="Say hello and ask about the material…"
                        className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
                        disabled={checking || sending}
                      />
                      <button
                        onClick={handleSend}
                        disabled={checking || sending || !message.trim()}
                        className={
                          "w-full rounded-lg px-3 py-2 text-sm font-semibold text-white " +
                          (checking || sending || !message.trim()
                            ? "bg-gray-400"
                            : "bg-purple-600 hover:bg-purple-700")
                        }
                      >
                        {sending ? "Sending…" : "Send"}
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










