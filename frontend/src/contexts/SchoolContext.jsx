// src/contexts/SchoolContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const SchoolContext = createContext();

export const useSchool = () => useContext(SchoolContext);

const schoolThemes = {
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
  bu: {
    primary: "#CC0000",
    bg: "#fff5f5",
    text: "#7f0000",
  },
};

export const SchoolProvider = ({ children }) => {
  const [school, setSchoolState] = useState(() => {
    return localStorage.getItem("selectedSchool") || null;
  });

  const setSchool = (value) => {
    setSchoolState(value);
    localStorage.setItem("selectedSchool", value);
  };

  const schoolTheme =
    school ? schoolThemes[school] || schoolThemes["nyu"] : schoolThemes["nyu"];

  return (
    <SchoolContext.Provider value={{ school, setSchool, schoolTheme }}>
      {children}
    </SchoolContext.Provider>
  );
};
