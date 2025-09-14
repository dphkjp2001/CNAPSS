// frontend/src/components/CourseCodePicker.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

export default function CourseCodePicker({
  school = "",
  value = "",
  onChange,
  onSelect, // ✅ new: returns { code, title }
  placeholder = "Search course code or title (e.g., CAMS-UA 148, Calculus)",
  required = false,
  id,
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const boxRef = useRef(null);

  const isNYU = (school || "").toLowerCase() === "nyu";

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    let alive = true;
    async function loadNYU() {
      try {
        const res = await fetch("/NYU_course_DATA.json");
        const json = await res.json();
        if (!alive) return;
        setList(Array.isArray(json) ? json : []);
      } catch {
        if (alive) setList([]);
      }
    }
    if (isNYU) loadNYU();
    else setList([]);
    return () => {
      alive = false;
    };
  }, [isNYU]);

  const normalize = (c) => {
    const codeRaw =
      c.course_code || c.code || c.class_code || c.classCode || c.class_number || c.classNumber || "";
    const titleRaw = c.course_title || c.title || c.name || c.courseName || c.course || "";
    const code = String(codeRaw || "").toUpperCase();
    const title = String(titleRaw || "");
    return { code, title };
  };

  const suggestions = useMemo(() => {
    if (!isNYU) return [];
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return list
      .map(normalize)
      .filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [list, query, isNYU]);

  const choose = (item) => {
    const code = String(item?.code || "").toUpperCase();
    setQuery(code);
    onChange?.(code); // backward compatible
    onSelect?.(item); // ✅ pass code + title
    setOpen(false);
  };

  // close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onChange?.(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        required={required}
        aria-required={required}
        autoComplete="off"
      />

      {isNYU && open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Type to search courses…</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.code + "::" + s.title}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => choose(s)}
                  >
                    <div className="font-medium">{s.code}</div>
                    {s.title ? <div className="text-xs text-gray-500 line-clamp-1">{s.title}</div> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}



