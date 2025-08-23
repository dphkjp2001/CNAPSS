// 📁 src/contexts/SchoolContext.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const SchoolContext = createContext();
export const useSchool = () => useContext(SchoolContext);

// ✅ single source of truth: use lowercase school codes
const THEMES = {
  nyu: {
    primary: "#8C52FF",
    bg: "#f6f3ff",
    text: "#4c1d95",
  },
  columbia: {
    primary: "#0066CC",
    bg: "#eef6fc",
    text: "#003366",
  },
  boston: {
    primary: "#CC0000",
    bg: "#fff5f5",
    text: "#7f0000",
  },
};

// Optional: allow aliases (ex: "bu" -> "boston")
const ALIASES = {
  bu: "boston",
};

const normalize = (v) => {
  if (!v) return null;
  const key = String(v).trim().toLowerCase();
  return ALIASES[key] || key;
};

export const SchoolProvider = ({ children }) => {
  // URL 우선, 없으면 로컬 스토리지
  const params = useParams();
  const urlSchool = normalize(params.school);
  const [school, setSchoolState] = useState(() => {
    const saved =
      normalize(localStorage.getItem("selectedSchool")) ||
      normalize(localStorage.getItem("lastVisitedSchool"));
    return saved || urlSchool || null;
  });

  // 외부에서 setSchool 호출 시 저장도 함께
  const setSchool = (value) => {
    const norm = normalize(value);
    setSchoolState(norm);
    if (norm) {
      localStorage.setItem("selectedSchool", norm);
      localStorage.setItem("lastVisitedSchool", norm); // ✅ unify keys
    }
  };

  // URL로 학교가 바뀌면 컨텍스트도 동기화
  useEffect(() => {
    if (urlSchool && urlSchool !== school) {
      setSchool(urlSchool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSchool]);

  const schoolTheme = useMemo(() => {
    const key = normalize(school);
    return (key && THEMES[key]) || THEMES.nyu; // default nyu
  }, [school]);

  const value = useMemo(
    () => ({ school, setSchool, schoolTheme }),
    [school, schoolTheme]
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
};

