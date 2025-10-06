// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

import { getPublicPosts, createPost } from "../../api/posts";
import { listAcademicPosts } from "../../api/academic";

const TOKENS = { pageBg: "#FAFAFA" };

function Person() {
  return (
    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
        <circle cx="12" cy="8" r="4" fill="#cbd5e1" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#cbd5e1" />
      </svg>
    </div>
  );
}

function Tabs({ value, onChange }) {
  return (
    <div className="w-full flex justify-center">
      <div className="relative inline-flex items-center gap-8">
        <button
          type="button"
          onClick={() => onChange("free")}
          className={`text-[22px] font-bold flex items-center gap-2 ${value === "free" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
        >
          <span>💬</span> <span>Freeboard</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("academic")}
          className={`text-[22px] font-bold flex items-center gap-2 ${value === "academic" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
        >
          <span>🎓</span> <span>Academic</span>
        </button>
      </div>
    </div>
  );
}

function normalizeList(payload) {
  if (!payload) return [];
  const arr =
    Array.isArray(payload) ? payload :
    Array.isArray(payload.items) ? payload.items :
    Array.isArray(payload.data) ? payload.data :
    Array.isArray(payload.posts) ? payload.posts :
    [];
  return arr.map((p) => ({
    _id: p._id || p.id,
    title: p.title || (p.content || "").slice(0, 80),
    createdAt: p.createdAt,
    raw: p,
  }));
}

function academicBadge(p) {
  const r = p.raw || {};
  const mode = String(r.mode || (r.lookingFor ? "looking_for" : "general")).toLowerCase();
  const kind = String(r.kind || r.category || "").toLowerCase();
  if (mode === "looking_for") {
    if (kind.includes("group")) return "👥";
    if (kind.includes("coffee")) return "☕️";
    return "📝";
  }
  return "❓";
}

export default function Dashboard() {
  const { school } = useSchool();
  const schoolKey = school || "nyu";
  const { user } = useAuth();
  const isAuthed = !!user;

  const navigate = useNavigate();
  const location = useLocation();
  const go = useSchoolPath();

  const [tab, setTab] = useState("academic");
  useEffect(() => {
    const p = new URLSearchParams(location.search).get("tab");
    if (p === "free") setTab("free");
    if (p === "academic") setTab("academic");
  }, [location.search]);

  // lists
  const [free, setFree] = useState({ loading: true, items: [], err: "" });
  const [acad, setAcad] = useState({ loading: true, items: [], err: "" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [freeRes, acadRes] = await Promise.all([
          getPublicPosts({ school: schoolKey, limit: 50, board: "freeboard" }),
          listAcademicPosts({ school: schoolKey, page: 1, limit: 50 }),
        ]);
        if (!alive) return;
        setFree({ loading: false, items: normalizeList(freeRes), err: "" });
        setAcad({ loading: false, items: normalizeList(acadRes), err: "" });
      } catch (e) {
        if (!alive) return;
        setFree({ loading: false, items: [], err: "Failed to load" });
        setAcad({ loading: false, items: [], err: "Failed to load" });
      }
    })();
    return () => { alive = false; };
  }, [schoolKey]);

  // composer
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [mode, setMode] = useState("general"); // for academic only
  const [lfKind, setLfKind] = useState("course_materials");

  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState("");

  const canPost =
    tab === "free"
      ? isAuthed && title.trim() && (content.trim() || images.length)
      : isAuthed && title.trim() && (mode === "general" ? content.trim() : true);

  const uploadFiles = async (files) => {
    const urls = [];
    for (const f of files) {
      try {
        const r = await uploadToCloudinary(f);
        if (r?.secure_url || r?.url) urls.push(r.secure_url || r.url);
      } catch {}
    }
    return urls;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setPosting(true);
    setMsg("");
    try {
      if (tab === "free") {
        let imageUrls = [];
        if (images.length) imageUrls = await uploadFiles(images);
        await createPost({
          school: schoolKey,
          board: "freeboard",
          title: title.trim(),
          content: content.trim(),
          images: imageUrls,
        });
      } else {
        if (mode === "general") {
          await createPost({
            school: schoolKey,
            board: "academic",
            mode: "general",
            title: title.trim(),
            content: content.trim(),
          });
        } else {
          await createPost({
            school: schoolKey,
            board: "academic",
            mode: "looking_for",
            kind: lfKind, // "course_materials" | "study_group" | "coffee_chat"
            title: title.trim(),
            content: content.trim(),
          });
        }
      }
      setTitle(""); setContent(""); setImages([]); setMode("general"); setLfKind("course_materials");
      setMsg("Posted!");
    } catch (e) {
      setMsg(e?.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const openDetail = (post, isAcademic) => {
    const id = post.raw?._id || post._id;
    navigate(go(isAcademic ? `/academic/${id}` : `/freeboard/${id}`));
  };

  const current = tab === "free" ? free : acad;

  return (
    <div className="min-h-screen" style={{ background: TOKENS.pageBg }}>
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-[minmax(620px,700px)_380px] gap-10">
        {/* FEED */}
        <section className="md:col-start-1">
          <Tabs value={tab} onChange={setTab} />

          {current.loading ? (
            <ul className="mt-5 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="h-16 rounded-xl bg-white/70 border border-slate-200 animate-pulse" />
              ))}
            </ul>
          ) : current.items.length ? (
            <ul className="mt-5 mx-auto max-w-[700px] px-2">
              {current.items.map((p) => (
                <li key={p._id} className="mx-6 border-b border-slate-300/80">
                  <button
                    type="button"
                    onClick={() => openDetail(p, tab === "academic")}
                    className="w-full text-left py-4 px-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      {tab === "academic" ? (
                        <span className="text-[14px] w-5 text-center">{academicBadge(p)}</span>
                      ) : (
                        <span className="w-5" />
                      )}
                      <Person />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{p.title}</div>
                        <div className="text-xs text-slate-500">
                          Posted by anonymous • {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto max-w-[700px] text-center py-16 text-slate-600">No posts yet.</div>
          )}
        </section>

        {/* COMPOSER */}
        <aside className="md:col-start-2 md:sticky md:top-[24px] self-start">
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <form onSubmit={onSubmit}>
              <div className="flex items-center gap-3 p-4 border-b border-slate-200">
                <Person />
                <div className="flex-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      tab === "free"
                        ? "Write a catchy title…"
                        : mode === "general"
                        ? "Ask an academic/career question…"
                        : "Looking for… (short title)"
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px] font-semibold text-slate-900 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">Posting as anonymous</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {tab === "academic" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("general")}
                      className={`px-3 py-1.5 rounded-full text-sm border ${mode === "general" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
                    >
                      General question
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("looking_for")}
                      className={`px-3 py-1.5 rounded-full text-sm border ${mode === "looking_for" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
                    >
                      Looking for 📥
                    </button>

                    {mode === "looking_for" && (
                      <select
                        value={lfKind}
                        onChange={(e) => setLfKind(e.target.value)}
                        className="ml-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm"
                      >
                        <option value="course_materials">Course materials</option>
                        <option value="study_group">Study group</option>
                        <option value="coffee_chat">Coffee chat</option>
                      </select>
                    )}
                  </div>
                )}

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    tab === "free"
                      ? "Write your content here…"
                      : mode === "general"
                      ? "Describe your academic/career question…"
                      : lfKind === "course_materials"
                      ? "Describe what you need…"
                      : lfKind === "study_group"
                      ? "Describe schedule, level, topic…"
                      : "Say hello and what you'd like to chat about…"
                  }
                  className="w-full min-h-[120px] rounded-xl border border-slate-300 px-3 py-2 text-[14px] text-slate-800 focus:outline-none"
                />

                {tab === "free" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setImages(Array.from(e.target.files || []))}
                      className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-50"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[12px] text-slate-500">
                    Posting to{" "}
                    <strong>
                      {tab === "free"
                        ? "Freeboard"
                        : mode === "general"
                        ? "Academic • General question ?"
                        : `Looking for: ${
                            lfKind === "course_materials" ? "Course materials" : lfKind === "study_group" ? "Study group" : "Coffee chat"
                          }`}
                    </strong>
                    .
                  </p>
                  <button
                    type="submit"
                    disabled={!canPost || posting}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {posting ? "Posting…" : "Post"}
                  </button>
                </div>

                {!!msg && <div className="text-sm text-slate-700">{msg}</div>}
              </div>
            </form>
          </div>
        </aside>
      </main>
    </div>
  );
}











