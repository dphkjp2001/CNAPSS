// const express = require("express");
// const router = express.Router();
// const Course = require("../models/CourseCatalog");

// // 🔍 GET /api/courses?query=marine
// router.get("/", async (req, res) => {
//   const { query } = req.query;
//   try {
//     const q = query ? query.trim().toLowerCase() : "";
//     const courses = await Course.find({
//       $or: [
//         { course_code: { $regex: q, $options: "i" } },
//         { course_title: { $regex: q, $options: "i" } },
//       ],
//     }).limit(50);

//     res.json(courses);
//   } catch (err) {
//     console.error("Course search error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // 🆕 POST /api/courses (admin only - initial import)
// router.post("/", async (req, res) => {
//   try {
//     const payload = req.body;
//     if (!Array.isArray(payload)) {
//       return res.status(400).json({ error: "Payload must be an array of courses." });
//     }

//     await Course.deleteMany({}); // ⚠️ 초기화 후 저장 (optionally skip this)
//     await Course.insertMany(payload);

//     res.json({ message: "Courses uploaded successfully.", count: payload.length });
//   } catch (err) {
//     console.error("Course upload error:", err);
//     res.status(500).json({ error: "Upload failed" });
//   }
// });

// module.exports = router;


// backend/routes/courses.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const CourseCatalog = require("../models/CourseCatalog");

const norm = (v) => String(v || "").trim();
const nlow = (v) => norm(v).toLowerCase();
const nup = (v) => norm(v).toUpperCase();

// GET /api/:school/courses/search?sem=2025-fall&q=calc&page=1&limit=20
router.get("/search", async (req, res) => {
  const school = nlow(req.params.school);
  const q = norm(req.query.q || "");
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));

  const filter = { school };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    Object.assign(filter, { $or: [{ code: rx }, { title: rx }, { aliases: rx }] });
  }

  const [items, total] = await Promise.all([
    CourseCatalog.find(filter)
      .sort({ code: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CourseCatalog.countDocuments(filter),
  ]);

  res.json({
    page,
    limit,
    total,
    items: items.map((c) => ({ id: c._id, code: c.code, title: c.title })),
  });
});

// (Optional) POST /api/:school/courses/catalog  → upsert minimal course
router.post("/catalog", async (req, res) => {
  const school = nlow(req.params.school);
  const code = nup(req.body?.code || "");
  const title = norm(req.body?.title || "");
  if (!code) return res.status(400).json({ message: "code is required" });

  const doc = await CourseCatalog.findOneAndUpdate(
    { school, code },
    { $set: { title } },
    { upsert: true, new: true }
  );
  res.json({ ok: true, course: { id: doc._id, code: doc.code, title: doc.title } });
});

module.exports = router;
