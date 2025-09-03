// backend/routes/public.materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const User = require("../models/User");

// same allowed schools as other public endpoints
const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const n = (v) => String(v || "").trim();
const low = (v) => n(v).toLowerCase();

async function attachAuthorNames(docs) {
  const arr = Array.isArray(docs) ? docs : [docs];
  const missing = arr.filter((m) => !n(m.authorName));
  if (!missing.length) return Array.isArray(docs) ? docs : docs;

  const emails = [
    ...new Set(missing.map((m) => low(m.uploaderEmail)).filter(Boolean)),
  ];
  if (!emails.length) return Array.isArray(docs) ? docs : docs;

  const users = await User.find({ email: { $in: emails } })
    .select("email nickname")
    .lean();

  const nickMap = Object.fromEntries(
    users.map((u) => [low(u.email), u.nickname])
  );

  const fill = (m) =>
    n(m.authorName) ? m : { ...m, authorName: nickMap[low(m.uploaderEmail)] || "" };

  return Array.isArray(docs) ? docs.map(fill) : fill(docs);
}

/**
 * GET /api/public/:school/materials/recent?limit=5
 * - minimal safe fields only (no description/tags/resources)
 */
router.get("/recent", async (req, res) => {
  try {
    const school = low(req.params.school);
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "5", 10)));

    let items = await Material.find({
      school,
      status: { $ne: "archived" },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    items = await attachAuthorNames(items);

    res.json({
      items: items.map((m) => ({
        id: m._id,
        courseCode: m.courseCode,
        courseTitle: m.courseTitle,
        professor: m.professor || "",
        semester: m.semester,
        materialType: m.materialType,
        kind: m.kind,
        title: m.title,
        authorName: m.authorName || "",
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error("Public materials recent error:", err);
    res.status(500).json({ message: "Failed to load public materials." });
  }
});

module.exports = router;

