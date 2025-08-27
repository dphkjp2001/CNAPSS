// const express = require("express");
// const router = express.Router();
// const Schedule = require("../models/Schedule");

// // POST /api/schedule → 사용자 시간표 저장
// router.post("/", async (req, res) => {
//   const { userId, blocks } = req.body;
//   if (!userId || !Array.isArray(blocks)) {
//     return res.status(400).json({ error: "Invalid input" });
//   }
//   try {
//     await Schedule.findOneAndUpdate(
//       { userId },
//       { blocks },
//       { upsert: true, new: true }
//     );
//     res.json({ message: "Schedule saved." });
//   } catch (err) {
//     console.error("Save schedule error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // GET /api/schedule/:userId → 한 명 스케쥴 불러오기
// router.get("/:userId", async (req, res) => {
//   try {
//     const schedule = await Schedule.findOne({ userId: req.params.userId });
//     res.json(schedule || { blocks: [] });
//   } catch (err) {
//     console.error("Fetch schedule error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // POST /api/schedule/compare → 여러 유저 스케쥴 비교
// router.post("/compare", async (req, res) => {
//   const { userIds } = req.body;
//   if (!Array.isArray(userIds)) {
//     return res.status(400).json({ error: "userIds must be an array" });
//   }
//   try {
//     const schedules = await Schedule.find({ userId: { $in: userIds } });
//     const allBlocks = schedules.map((s) => s.blocks);
//     res.json({ schedules: allBlocks });
//   } catch (err) {
//     console.error("Compare error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// module.exports = router;




// backend/routes/schedule.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Schedule = require("../models/Schedule");
const User = require("../models/User");

/** helpers */
const norm = (v) => String(v || "").trim().toLowerCase();
const isValidSemester = (s) => /^[0-9]{4}-(spring|summer|fall|winter)$/i.test(s);

// "HH:MM" → 0..48 (30분 단위 인덱스)
function toIndex(hhmm) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return Math.max(0, Math.min(48, h * 2 + (m >= 30 ? 1 : 0)));
}

const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

/** GET /api/:school/schedule/my?semester=2025-fall
 *  내 저장 스케줄 조회 (없으면 {slots:[]} 반환)
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
 *  body: { semester: "2025-fall", slots: [{day,start,end}, ...] }
 *  - 기존 문서 있으면 교체(upsert)
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

  // 간단 검증
  for (const s of slots) {
    if (!DAYS.includes(s?.day)) return res.status(400).json({ message: "Invalid day" });
    if (!/^\d{2}:\d{2}$/.test(s?.start) || !/^\d{2}:\d{2}$/.test(s?.end)) {
      return res.status(400).json({ message: "Invalid time format HH:MM" });
    }
    if (toIndex(s.start) >= toIndex(s.end)) {
      return res.status(400).json({ message: "start must be before end" });
    }
  }

  const doc = await Schedule.findOneAndUpdate(
    { school, userEmail: email, semester },
    { $set: { slots } },
    { upsert: true, new: true }
  );
  res.status(200).json({ ok: true, updatedAt: doc.updatedAt });
});




/** GET /api/:school/schedule/group/free?semester=2025-fall&members=a@x.edu,b@y.edu&min=30
 *  - 같은 학교 사용자만 허용
 *  - 모든 멤버의 "busy"를 합쳐서 공통 "free" window 계산(30분 단위)
 *  - 반환: { windows: [{day,start,end}, ...], members: [...], missing: [...]} 
 */
router.get("/group/free", async (req, res) => {
  const school = norm(req.params.school);
  const requester = norm(req.user?.email);
  const semester = String(req.query.semester || "");
  const min = Math.max(30, parseInt(req.query.min || "30", 10)); // 최소 free 길이(분)

  if (!school || !requester) return res.status(401).json({ message: "Unauthorized" });
  if (!semester || !isValidSemester(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }

  // member 목록: 요청자 포함하도록 자동 보정
  const raw = String(req.query.members || "").split(",").map(norm).filter(Boolean);
  const members = Array.from(new Set([requester, ...raw]));

  // 멤버 모두 같은 학교인지 검사
  const users = await User.find({ email: { $in: members }, school }).select("email").lean();
  const validEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const invalid = members.filter((m) => !validEmails.has(m));
  if (invalid.length > 0) {
    return res.status(400).json({ message: "Members must belong to the same school", invalid });
  }

  // 멤버 스케줄 로드
  const docs = await Schedule.find({ school, userEmail: { $in: members }, semester }).lean();
  const byEmail = new Map(docs.map((d) => [d.userEmail.toLowerCase(), d]));
  const missing = members.filter((m) => !byEmail.has(m));

  // busy 매트릭스: 7일 x 48칸(00:00~24:00, 30분 단위)
  const busyAll = Object.fromEntries(DAYS.map((d) => [d, new Array(48).fill(false)]));

  for (const d of docs) {
    for (const s of d.slots || []) {
      const arr = busyAll[s.day];
      const a = toIndex(s.start);
      const b = toIndex(s.end);
      for (let i = a; i < b; i++) arr[i] = true; // busy
    }
  }

  // 공통 FREE = 모든 멤버가 NOT busy 인 구간
  const windows = [];
  for (const day of DAYS) {
    const arr = busyAll[day];
    let i = 0;
    while (i < 48) {
      // free 시작 찾기
      while (i < 48 && arr[i]) i++;
      if (i >= 48) break;
      let j = i + 1;
      while (j < 48 && !arr[j]) j++;
      const minutes = (j - i) * 30;
      if (minutes >= min) {
        const toHHMM = (idx) => `${String(Math.floor(idx / 2)).padStart(2,"0")}:${idx % 2 ? "30" : "00"}`;
        windows.push({ day, start: toHHMM(i), end: toHHMM(j) });
      }
      i = j + 1;
    }
  }

  res.json({ semester, members, missing, windows });
});

module.exports = router;
