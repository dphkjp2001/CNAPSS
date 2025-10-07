// frontend/src/utils/schoolPath.js
import { useParams, generatePath } from "react-router-dom";
import { useSchool } from "../contexts/SchoolContext";

export function useSchoolParam() {
  const { school: urlSchool } = useParams();
  const { school, setSchool } = useSchool();
  if (urlSchool && urlSchool !== school) setSchool(urlSchool);
  return urlSchool || school;
}

export function useSchoolPath() {
  const s = useSchoolParam();
  return (path) =>
    generatePath("/:school/*", { school: s, "*": String(path).replace(/^\//, "") });
}
