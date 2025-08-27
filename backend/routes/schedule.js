// backend/routes/schedule.js  (POST /api/:school/schedule/my 부분만 교체)
const allowedDays = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const hhmm = /^\d{2}:\d{2}$/;

router.post("/my", async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const email = String(req.user?.email || "").toLowerCase();
  const { semester, slots } = req.body || {};

  if (!school || !email) return res.status(401).json({ message: "Unauthorized" });
  if (!semester || !isValidSemester(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }
  if (!Array.isArray(slots)) return res.status(400).json({ message: "slots must be an array" });

  // sanitize + validate
  const clean = [];
  for (const s of slots) {
    const day = String(s?.day || "").toUpperCase();
    const start = String(s?.start || "");
    const end = String(s?.end || "");
    const label = s?.label ? String(s.label).trim().slice(0, 120) : undefined;
    const classNumber = s?.classNumber ? String(s.classNumber).trim().slice(0, 60) : undefined;

    if (!allowedDays.includes(day)) return res.status(400).json({ message: "Invalid day" });
    if (!hhmm.test(start) || !hhmm.test(end)) return res.status(400).json({ message: "Invalid time format" });
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

