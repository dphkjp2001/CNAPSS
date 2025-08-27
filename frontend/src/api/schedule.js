// frontend/src/api/schedule.js
import { getJson, postJson } from "./http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getMySchedule({ school, token, semester }) {
  const url = new URL(`${API}/${school}/schedule/my`);
  url.searchParams.set("semester", semester);
  return getJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
}

export function saveMySchedule({ school, token, semester, slots }) {
  return postJson(
    `${API}/${school}/schedule/my`,
    { semester, slots },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function getGroupFree({ school, token, semester, members = [], min = 30 }) {
  const url = new URL(`${API}/${school}/schedule/group/free`);
  url.searchParams.set("semester", semester);
  if (members.length) url.searchParams.set("members", members.join(","));
  url.searchParams.set("min", String(min));
  return getJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
}
