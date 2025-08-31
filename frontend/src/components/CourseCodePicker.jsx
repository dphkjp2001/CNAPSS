// src/components/CourseCodePicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function CourseCodePicker({
  school = "",
  value = "",
  onChange,
  placeholder = "Search course code or title (e.g., CAMS-UA 148, Calculus)",
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const boxRef = useRef(null);

  const isNYU = (school || "").toLowerCase() === "nyu";

  // 외부에서 value가 바뀌면 입력창 동기화
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // NYU 정적 JSON 로드 → 올바른 키(course_code, course_title)로 매핑
  useEffect(() => {
    if (!isNYU) {
      setList([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/NYU_course_DATA.json");
        const json = await res.json();
        if (!alive) return;
        const mapped = Array.isArray(json)
          ? json.map((c) => ({
              code: String(c.course_code || "").toUpperCase(),
              title: String(c.course_title || ""),
            }))
          : [];
        setList(mapped);
      } catch {
        if (alive) setList([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isNYU]);

  // My schedule처럼 공백/하이픈 제거 정규화
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s\-]/g, "");

  // 스크롤 가능한 자동완성 (최대 60개)
  const suggestions = useMemo(() => {
    if (!isNYU) return [];
    const q = norm(query);
    if (!q) return [];
    const result = [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (norm(c.code).includes(q) || norm(c.title).includes(q)) {
        result.push(c);
        if (result.length >= 60) break; // 이전 8개 제한 제거 :contentReference[oaicite:3]{index=3}
      }
    }
    return result;
  }, [list, query, isNYU]);

  const choose = (code) => {
    const v = (code || "").toUpperCase();
    onChange?.(v);
    setQuery(v);
    setOpen(false);
  };

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
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
        autoComplete="off"
      />

      {isNYU && open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Type to search courses…</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={`${s.code}::${s.title}`}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => choose(s.code)}
                  >
                    <div className="font-medium">{s.code}</div>
                    {s.title ? (
                      <div className="text-xs text-gray-500 line-clamp-1">{s.title}</div>
                    ) : null}
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

