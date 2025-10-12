// frontend/src/pages/academic/AcademicDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { getPublicAcademicPost } from "../../api/academicPosts";
import { createRequest, checkRequestExists } from "../../api/request";
import CommentSection from "../../components/CommentSection";

const MATERIAL_LABELS = {
  lecture_notes: "Lecture Notes",
  syllabus: "Syllabus",
  past_exams: "Past Exams",
  quiz_prep: "Quiz Prep",
};

function kindEmoji(kind = "") {
  const k = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (k.includes("course_material")) return "📝";
  if (k.includes("study")) return "👥";
  if (k.includes("coffee")) return "☕️";
  return "📌";
}

export default function AcademicDetail() {
  const { school: schoolFromPath, id } = useParams();
  const { school: ctxSchool } = useSchool();
  const school = schoolFromPath || ctxSchool || "nyu";
  const { user } = useAuth();

  const [state, setState] = useState({ loading: true, error: "", post: null });
  const [reqMsg, setReqMsg] = useState("");
  const [reqSending, setReqSending] = useState(false);
  const [flash, setFlash] = useState("");
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPublicAcademicPost({ school, id });
        if (!alive) return;
        setState({ loading: false, error: "", post: p });
      } catch (err) {
        if (!alive) return;
        setState({ loading: false, error: err?.message || "Failed to load post.", post: null });
      }
    })();
    return () => { alive = false; };
  }, [school, id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) return;
        const res = await checkRequestExists({ school, targetId: id });
        if (!alive) return;
        setRequested(!!res?.exists);
      } catch {}
    })();
    return () => { alive = false; };
  }, [school, id, user]);

  const meta = useMemo(() => {
    const p = state.post || {};
    const mode =
      (p.mode || p.postType || p.type || (p.lookingFor ? "looking_for" : "general") || "general").toString().toLowerCase();
    return { isSeeking: mode === "looking_for" || mode === "seeking", mode, kind: p.kind || "" };
  }, [state.post]);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!user) return setFlash("Please log in to send a request.");
    if (!reqMsg.trim()) return setFlash("Please write a short message.");

    setReqSending(true);
    setFlash("");
    try {
      await createRequest({ school, targetId: id, message: reqMsg.trim() });
      setReqMsg("");
      setRequested(true);
      setFlash("Request sent! Check Messages.");
    } catch (err) {
      setFlash(err?.message || "Failed to send request.");
    } finally {
      setReqSending(false);
    }
  };

  if (state.loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (state.error) return <div className="p-6 text-red-600">{state.error}</div>;
  if (!state.post) return <div className="p-6 text-gray-500">Post not found.</div>;

  const { title, content, createdAt, kind, professor, materials = [] } = state.post;

  const isCourseMaterials = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_") === "course_materials";
  const materialLabels = (Array.isArray(materials) ? materials : [])
    .map((k) => MATERIAL_LABELS[k] || k)
    .filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <article className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="inline-flex items-center gap-2">
              <span>{meta.isSeeking ? kindEmoji(kind) : "💬"}</span>
              <span className="font-medium">
                {meta.isSeeking ? "Seeking" : "General question"}
              </span>
              {isCourseMaterials && <span className="text-slate-400">• Course Materials</span>}
            </div>
            <time dateTime={createdAt}>{new Date(createdAt).toLocaleString()}</time>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>

          {/* materials & professor badges */}
          {isCourseMaterials && (materialLabels.length || professor) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {materialLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                >
                  {lbl}
                </span>
              ))}
              {professor && (
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  Professor: {professor}
                </span>
              )}
            </div>
          ) : null}
        </header>

        <div className="px-5 py-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
          {content}
        </div>

        {meta.isSeeking ? (
          <div className="px-5 py-5 border-t border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold mb-2">Send a Request</h2>
            <p className="text-sm text-slate-600 mb-3">
              This post doesn’t have comments. Send a private request to the author instead.
            </p>
            <form onSubmit={submitRequest} className="space-y-3">
              <textarea
                value={reqMsg}
                onChange={(e) => setReqMsg(e.target.value)}
                placeholder="Write a short message (who you are / what you need)…"
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                disabled={requested}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Target: <strong>Academic · {kind || "general"}</strong>
                </p>
                <button
                  type="submit"
                  disabled={reqSending || requested || !reqMsg.trim()}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {requested ? "Already requested" : reqSending ? "Sending…" : "Send request"}
                </button>
              </div>
              {!!flash && (
                <div
                  className={`text-sm px-3 py-2 rounded-lg border ${
                    flash.includes("sent") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {flash}
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="px-5 py-5 border-t border-slate-200 bg-white">
            {/* ✅ FIX: pass postId (NOT targetId) */}
            <CommentSection postId={id} />
          </div>
        )}
      </article>
    </div>
  );
}



