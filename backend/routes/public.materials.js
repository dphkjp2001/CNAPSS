// backend/routes/public.materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const User = require("../models/User");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const n = (v) => String(v || "").trim();
const low = (v) => n(v).toLowerCase();

// safe regex
const escapeRe = (s) => n(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
 * GET /api/public/:school/materials/recent
 * Query: page, limit, q, prof, type
 */
router.get("/recent", async (req, res) => {
  try {
    const school = low(req.params.school);
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const q = n(req.query.q || "");
    const prof = n(req.query.prof || "");
    const type = low(req.query.type || "all");

    // 공개는 항상 status: active
    const filter = { school, status: "active" };
    if (q) {
      const r = new RegExp(escapeRe(q), "i");
      filter.$or = [{ courseCode: r }, { courseTitle: r }];
    }
    if (prof) filter.professor = new RegExp(escapeRe(prof), "i");
    if (type === "sale" || type === "wanted") filter.listingType = type;

    const [itemsRaw, total] = await Promise.all([
      Material.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Material.countDocuments(filter),
    ]);

    const itemsFilled = await attachAuthorNames(itemsRaw);

    const items = itemsFilled.map((m) => ({
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
    }));

    res.json({
      items,
      page,
      limit,
      total,
      hasMore: (page - 1) * limit + items.length < total,
    });
  } catch (err) {
    console.error("Public materials recent error:", err);
    res.status(500).json({ message: "Failed to load public materials." });
  }
});

/**
 * ✅ NEW: GET /api/public/:school/materials/:id
 * - 비로그인 공개 상세 조회
 * - 민감한 내부 필드는 배제하고, 상세에 필요한 필드는 그대로 제공
 */
router.get("/:id", async (req, res) => {
  try {
    const school = low(req.params.school);
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    let doc = await Material.findOne({ _id: req.params.id, school, status: { $ne: "archived" } }).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });

    doc = (await attachAuthorNames(doc)) || doc;

    // 공개 상세: 프론트 상세뷰에 필요한 필드 위주
    const safe = {
      _id: doc._id,
      school: doc.school,
      courseCode: doc.courseCode,
      courseTitle: doc.courseTitle,
      professor: doc.professor || "",
      semester: doc.semester,
      kind: doc.kind,
      materialType: doc.materialType,
      title: doc.title,
      description: doc.description || "",
      isFree: !!doc.isFree,
      price: Number(doc.price || 0),
      sharePreference: doc.sharePreference,
      status: doc.status,
      listingType: doc.listingType || "sale",
      offerings: Array.isArray(doc.offerings) ? doc.offerings : [],
      regarding: doc.regarding || "",
      authorName: doc.authorName || "",
      uploaderEmail: doc.uploaderEmail || "", // 소유자 판별용(프론트에서 isOwner 계산)
      likeCount: Number(doc.likeCount || 0),
      viewCount: Number(doc.viewCount || 0),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    res.json(safe);
  } catch (err) {
    console.error("Public material detail error:", err);
    res.status(500).json({ message: "Failed to load material." });
  }
});

module.exports = router;


