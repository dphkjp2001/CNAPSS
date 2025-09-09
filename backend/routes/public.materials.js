// backend/routes/public.materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const User = require("../models/User");

// same allowed schools as other public endpoints
const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const n = (v) => String(v || "").trim();
const low = (v) => n(v).toLowerCase();

// ---- utilities ----
async function attachAuthorNames(docs) {
  const arr = Array.isArray(docs) ? docs : [docs];
  const missing = arr.filter((m) => !n(m.authorName));
  if (!missing.length) return Array.isArray(docs) ? docs : docs;

  const emails = [...new Set(missing.map((m) => low(m.uploaderEmail)).filter(Boolean))];
  if (!emails.length) return Array.isArray(docs) ? docs : docs;

  const users = await User.find({ email: { $in: emails } })
    .select("email nickname")
    .lean();

  const nickMap = Object.fromEntries(users.map((u) => [low(u.email), u.nickname]));
  const fill = (m) => (n(m.authorName) ? m : { ...m, authorName: nickMap[low(m.uploaderEmail)] || "" });

  return Array.isArray(docs) ? docs.map(fill) : fill(docs);
}

/**
 * GET /api/public/:school/materials/recent?limit=5&type=sale|wanted|all
 * - public(비로그인) 대시보드/프리뷰용
 * - ⚠️ 기존 문제: type을 무시해서 sale/wanted가 섞여 반환됨 → 아래에서 해결
 */
router.get("/recent", async (req, res) => {
  try {
    const school = low(req.params.school);
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "5", 10)));
    const type = low(req.query.type || "all"); // "sale" | "wanted" | "all"

    // ✅ 로그인 버전과 동일한 필터 로직 적용
    //    - status는 'active'만 노출(삭제/아카이브/판매완료 노출 방지)
    const filter = { school, status: "active" };
    if (type === "sale" || type === "wanted") {
      filter.listingType = type;
    }

    let items = await Material.find(filter)
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
        listingType: m.listingType || "sale",
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error("Public materials recent error:", err);
    res.status(500).json({ message: "Failed to load public materials." });
  }
});

module.exports = router;
