// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getMaterial } from "../../api/materials";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700">
      {children}
    </span>
  );
}

export default function MaterialDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { school } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const { search } = useLocation();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // for "Back to list": keep course & semester context if provided via query
  const backCourse = useMemo(() => new URLSearchParams(search).get("course") || "", [search]);
  const backSem = useMemo(() => new URLSearchParams(search).get("sem") || "", [search]);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!token || !school || !id) return;
      setLoading(true);
      setErr("");
      try {
        const data = await getMaterial({ school, token, id });
        if (!alive) return;
        setItem(data || null);
      } catch (e) {
        if (alive) {
          setItem(null);
          setErr("Failed to load the material.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [token, school, id]);

  const onBack = () => {
    if (backCourse && backSem) {
      navigate(
        schoolPath(`/courses/${encodeURIComponent(backCourse)}/materials?sem=${encodeURIComponent(backSem)}`)
      );
    } else {
      navigate(-1);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  if (err) return (
    <div className="p-6">
      <button className="mb-3 rounded-xl border px-3 py-1.5 text-sm" onClick={onBack}>← Back</button>
      <p className="text-sm text-red-600">{err}</p>
    </div>
  );
  if (!item) return null;

  const created = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
  const hasAttachment = !!(item.url || item.fileUrl);

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Material detail</h1>
        <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={onBack}>← Back</button>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-2 text-sm text-gray-500">
          {item.courseCode ? <Badge>{item.courseCode}</Badge> : null}{" "}
          {item.semester ? <Badge>{item.semester}</Badge> : null}{" "}
          {item.kind ? <Badge>{String(item.kind).toUpperCase()}</Badge> : null}
          {/* Optional future fields (harmless if missing) */}
          {typeof item.isFree === "boolean" ? (
            item.isFree ? <Badge>FREE</Badge> : <Badge>PAID {typeof item.price === "number" ? `· $${item.price}` : ""}</Badge>
          ) : null}
          {item.materialType ? <Badge>{item.materialType}</Badge> : null}
          {item.sharePreference ? <Badge>{item.sharePreference}</Badge> : null}
        </div>

        <h2 className="mb-2 text-lg font-medium">{item.title || item.courseCode}</h2>

        <div className="mb-3 text-sm text-gray-600">
          by <b>{item.authorName || item.uploaderEmail || "Unknown"}</b>
          {created ? <> · {created}</> : null}
        </div>

        {hasAttachment ? (
          <div className="mb-4">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Open external link
              </a>
            ) : (
              <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Open file
              </a>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-dashed p-3 text-sm text-gray-500">
            No attachment provided for this posting.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            ❤ {item.likeCount || 0} · 👁 {item.viewCount || 0}
          </div>

          {/* Later: “Inquiry / Message” button can be added here */}
          <div className="flex gap-2">
            {item.courseCode && (
              <button
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() =>
                  navigate(
                    schoolPath(
                      `/courses/${encodeURIComponent(item.courseCode)}/materials?sem=${encodeURIComponent(
                        item.semester || ""
                      )}`
                    )
                  )
                }
              >
                View course materials
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
