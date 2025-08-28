// src/components/CourseCodePicker.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function CourseCodePicker({
  school = "",
  value = "",
  onChange,
  placeholder = "Search course code or title (e.g., CAMS-UA 148, Calculus)",
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);

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
    return () => { alive = false; };
  }, [isNYU]);

  const suggestions = useMemo(() => {
    if (!isNYU) return [];
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return list
      .map((c) => ({
        code: (c.code || c.classNumber || "").toUpperCase(),
        title: c.title || c.name || "",
      }))
      .filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [list, query, isNYU]);

  const choose = (code) => {
    onChange?.(code);
    setQuery(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!isNYU) onChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />
      {isNYU && open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {suggestions.map((s) => (
            <button
              type="button"
              key={s.code + s.title}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => choose(s.code)}
            >
              <div className="font-medium">{s.code}</div>
              <div className="text-xs text-gray-500 line-clamp-1">{s.title}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
