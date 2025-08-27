// backend/routes/schedule.js
const express = require("express");
const router = express.Router({ mergeParams: true });

const Schedule = require("../models/Schedule");
const User = require("../models/User");

/* ---------------- helpers ---------------- */
const norm = (v) => String(v || "").trim().toLowerCase();
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const allowedDays = DAYS;
const HHMM = /^\d{2}:\d{2}$/;
const SEM = /^[0-9]{4}-(spring|summer|fall|winter)$/i;

const isValidSemester = (s) => SEM.test(String(s || ""));
// "HH:MM" -> 0..48 (30-minute slots)
function toIndex(hhmm) {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  return Math.max(0, Math.min(48, h * 2 + (m >= 30 ? 1 : 0)));
}

/* ---------------- routes ---------------- */

/** GET /api/:school/schedule/my?semester=2025-fall
 *  Return my saved schedule (empty slots[] if none)
 */
router.get("/my", async (req, res) => {
  const school = norm(req.params.school);
  const email = norm(req.user?.email);
  const { semester } = req.query;

  if (!school || !email) return res.status(401).json({ message: "Unauthorized" });
  if (!semester || !isValidSemester(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }

  const doc = await Schedule.findOne({ school, userEmail: email, semester }).lean();
  res.json({ school, userEmail: email, semester, slots: doc?.slots || [] });
});

/** POST /api/:school/schedule/my
 *  body: { semester: "2025-fall", slots: [{day,start,end,label?,classNumber?}, ...] }
 *  Upsert (replace) my schedule for the semester
 */
router.post("/my", async (req, res) => {
  const school = norm(req.params.school);
  const email = norm(req.user?.email);
  const { semester, slots } = req.body || {};

  if (!school || !email) return res.status(401).json({ message: "Unauthorized" });
  if (!semester || !isValidSemester(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }
  if (!Array.isArray(slots)) {
    return res.status(400).json({ message: "slots must be an array" });
  }

  // sanitize + validate
  const clean = [];
  for (const s of slots) {
    const day = String(s?.day || "").toUpperCase();
    const start = String(s?.start || "");
    const end = String(s?.end || "");
    const label = s?.label ? String(s.label).trim().slice(0, 120) : undefined;
    const classNumber = s?.classNumber ? String(s.classNumber).trim().slice(0, 60) : undefined;

    if (!allowedDays.includes(day)) return res.status(400).json({ message: "Invalid day" });
    if (!HHMM.test(start) || !HHMM.test(end)) return res.status(400).json({ message: "Invalid time format HH:MM" });
    if (toIndex(start) >= toIndex(end)) return res.status(400).json({ message: "start must be before end" });

    clean.push({ day, start, end, ...(label ? { label } : {}), ...(classNumber ? { classNumber } : {}) });
  }

  const doc = await Schedule.findOneAndUpdate(
    { school, userEmail: email, semester },
    { $set: { slots: clean } },
    { upsert: true, new: true }
  );
  res.json({ ok: true, updatedAt: doc.updatedAt });
});

/** GET /api/:school/schedule/group/free?semester=2025-fall&members=a@x.edu,b@y.edu&min=30
 *  Same-school only. Returns common free windows among members.
 *  Response: { semester, members, missing, windows: [{day,start,end}] }
 */
router.get("/group/free", async (req, res) => {
  const school = norm(req.params.school);
  const requester = norm(req.user?.email);
  const semester = String(req.query.semester || "");
  const min = Math.max(30, parseInt(req.query.min || "30", 10)); // min window length in minutes

  if (!school || !requester) return res.status(401).json({ message: "Unauthorized" });
  if (!semester || !isValidSemester(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }

  // members list (include requester by default)
  const raw = String(req.query.members || "")
    .split(",")
    .map(norm)
    .filter(Boolean);
  const members = Array.from(new Set([requester, ...raw]));

  // same-school enforcement
  const users = await User.find({ email: { $in: members }, school }).select("email").lean();
  const validEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const invalid = members.filter((m) => !validEmails.has(m));
  if (invalid.length > 0) {
    return res.status(400).json({ message: "Members must belong to the same school", invalid });
  }

  // load schedules
  const docs = await Schedule.find({ school, userEmail: { $in: members }, semester }).lean();
  const byEmail = new Map(docs.map((d) => [d.userEmail.toLowerCase(), d]));
  const missing = members.filter((m) => !byEmail.has(m));

  // busy matrix: 7 days x 48 half-hour slots
  const busyAll = Object.fromEntries(DAYS.map((d) => [d, new Array(48).fill(false)]));

  for (const d of docs) {
    for (const s of d.slots || []) {
      const arr = busyAll[s.day];
      const a = toIndex(s.start);
      const b = toIndex(s.end);
      for (let i = a; i < b; i++) arr[i] = true; // busy
    }
  }

  // common FREE = slots where no one is busy
  const windows = [];
  for (const day of DAYS) {
    const arr = busyAll[day];
    let i = 0;
    while (i < 48) {
      while (i < 48 && arr[i]) i++; // skip busy
      if (i >= 48) break;
      let j = i + 1;
      while (j < 48 && !arr[j]) j++; // extend free
      const minutes = (j - i) * 30;
      if (minutes >= min) {
        const toHHMM = (idx) => `${String(Math.floor(idx / 2)).padStart(2, "0")}:${idx % 2 ? "30" : "00"}`;
        windows.push({ day, start: toHHMM(i), end: toHHMM(j) });
      }
      i = j + 1;
    }
  }

  res.json({ semester, members, missing, windows });
});

module.exports = router;

