const express = require("express");
const router = express.Router();
const Course = require("../models/Course");

// 🔍 GET /api/courses?query=marine
router.get("/", async (req, res) => {
  const { query } = req.query;
  try {
    const q = query ? query.trim().toLowerCase() : "";
    const courses = await Course.find({
      $or: [
        { course_code: { $regex: q, $options: "i" } },
        { course_title: { $regex: q, $options: "i" } },
      ],
    }).limit(50);

    res.json(courses);
  } catch (err) {
    console.error("Course search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🆕 POST /api/courses (admin only - initial import)
router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: "Payload must be an array of courses." });
    }

    await Course.deleteMany({}); // ⚠️ 초기화 후 저장 (optionally skip this)
    await Course.insertMany(payload);

    res.json({ message: "Courses uploaded successfully.", count: payload.length });
  } catch (err) {
    console.error("Course upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;