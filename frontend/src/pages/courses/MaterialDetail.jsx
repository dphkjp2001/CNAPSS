// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getJson, deleteJson } from "../../api/http";

const prettyShare = (v) =>
  v === "in_person" ? "In person" : v === "online" ? "Online" : "Doesn't matter";

export default function CourseMaterialDetail() {
  const { id } = useParams();
  const { school } = useSchool();
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const courseCode = sp.get("course") || "";
  const sem = sp.get("sem") || "";

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  const isOwner = useMemo(() => {
    if (!doc || !user?.email) return false;
    return (doc.uploaderEmail || "").toLowerCase() === (user.email || "").toLowerCase();
  }, [doc, user]);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!id || !school) return;
      setLoading(true);
      setErr("");
      try {
        const url = `${API}/api/${encodeURIComponent(school)}/materials/${encodeURIComponent(id)}`;
        const data = await getJson(url);
        if (!alive) return;
        setDoc(data || null);
      } catch (e) {
        if (!alive) return;
        setDoc(null);
        setErr(e?.status === 404 ? "This posting was not found." : "Failed to load the posting.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [API, id, school]);

  const onBack = () => {
    // Prefer going back to list with preserved course/sem when available
    if (courseCode && sem) {
      navigate(
        schoolPath(
          `/courses/${encodeURIComponent(courseCode)}/materials?sem=${encodeURIComponent(sem)}`
        )
      );
    } else {
      navigate(-1);
    }
  };

  async function onDelete() {
    if (!doc) return;
    const ok = window.confirm("Delete this posting? This cannot be undone.");
    if (!ok) return;
    try {
      const url = `${API}/api/${encodeURIComponent(school)}/materials/${encodeURIComponent(
        doc._id || id
      )}`;
      await deleteJson(url);
      // After deletion, return to course list (if we know it), else back
      onBack();
    } catch {
      alert("Failed to delete. Please try again.");
    }
  }

  const primaryLink = useMemo(() => {
    if (!doc) return null;
    if (doc.url) return { href: doc.url, label: "Open external link" };
    if (doc.fileUrl) return { href: doc.fileUrl, label: "Open file" };
    return null;
  }, [doc]);

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Material</h1>
        <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={onBack}>
          ← Back
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border p-6 text-sm text-gray-600">Loading…</div>
      ) : err ? (
        <div className="rounded-xl border p-6 text-sm text-red-600">{err}</div>
      ) : !doc ? (
        <div className="rounded-xl border p-6 text-sm text-gray-600">No data.</div>
      ) : (
        <div className="space-y-4">
          {/* Header card */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">
                  {doc.courseCode} · {doc.semester}
                </div>
                <div className="mt-0.5 text-lg font-semibold">{doc.title || doc.courseCode}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {doc.kind ? doc.kind.toUpperCase() : "MATERIAL"} ·{" "}
                  {new Date(doc.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-2xl font-bold">
                  {doc.isFree ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    <>${doc.price}</>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {prettyShare(doc.sharePreference)}
                </div>
              </div>
            </div>

            {primaryLink ? (
              <a
                href={primaryLink.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-lg border px-3 py-1.5 text-sm text-blue-600"
              >
                {primaryLink.label}
              </a>
            ) : null}
          </div>

          {/* Meta */}
          <div className="rounded-xl border bg-white p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <div className="text-gray-500">Posted by</div>
                <div className="font-medium">
                  {doc.authorName || doc.uploaderEmail || "Unknown"}
                  {isOwner ? <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs">You</span> : null}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Type</div>
                <div className="font-medium">
                  {doc.materialType === "personalNote" ? "Personal Class Note" : "Personal Class Material"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Legacy kind</div>
                <div className="font-medium">{doc.kind || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Tags</div>
                <div className="font-medium">
                  {(doc.tags || []).length ? doc.tags.join(", ") : "-"}
                </div>
              </div>
            </div>

            {(doc.fileMime || doc.fileSize) && (
              <div className="mt-3 text-xs text-gray-500">
                {doc.fileMime ? <>MIME: {doc.fileMime} · </> : null}
                {Number.isFinite(doc.fileSize) && doc.fileSize > 0 ? (
                  <>Size: {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</>
                ) : null}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {courseCode && sem ? (
              <button
                className="rounded-xl border px-3 py-2 text-sm"
                onClick={() =>
                  navigate(
                    schoolPath(
                      `/courses/${encodeURIComponent(courseCode)}/materials?sem=${encodeURIComponent(sem)}`
                    )
                  )
                }
              >
                View course list
              </button>
            ) : null}

            {isOwner ? (
              <button
                className="rounded-xl border border-red-600 px-3 py-2 text-sm text-red-600"
                onClick={onDelete}
              >
                Delete
              </button>
            ) : null}
          </div>

          {/* Disclaimer (wireframe tiny text) */}
          <p className="text-xs text-gray-500">
            Only personal notes and self-created materials are permitted. Official course notes,
            commercial notes, or copyrighted materials are not allowed. The platform is not
            responsible for any transactions, content accuracy, or disputes.
          </p>
        </div>
      )}
    </div>
  );
}


