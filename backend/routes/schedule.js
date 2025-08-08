const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");

// POST /api/schedule → 사용자 시간표 저장
router.post("/", async (req, res) => {
  const { userId, blocks } = req.body;
  if (!userId || !Array.isArray(blocks)) {
    return res.status(400).json({ error: "Invalid input" });
  }
  try {
    await Schedule.findOneAndUpdate(
      { userId },
      { blocks },
      { upsert: true, new: true }
    );
    res.json({ message: "Schedule saved." });
  } catch (err) {
    console.error("Save schedule error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/schedule/:userId → 한 명 스케쥴 불러오기
router.get("/:userId", async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ userId: req.params.userId });
    res.json(schedule || { blocks: [] });
  } catch (err) {
    console.error("Fetch schedule error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/schedule/compare → 여러 유저 스케쥴 비교
router.post("/compare", async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: "userIds must be an array" });
  }
  try {
    const schedules = await Schedule.find({ userId: { $in: userIds } });
    const allBlocks = schedules.map((s) => s.blocks);
    res.json({ schedules: allBlocks });
  } catch (err) {
    console.error("Compare error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
