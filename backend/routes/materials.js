// backend/routes/materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const CourseCatalog = require("../models/CourseCatalog");
const User = require("../models/User"); // ✅ for nickname lookup

const n = (v) => String(v || "").trim();
const low = (v) => n(v).toLowerCase();
const up = (v) => n(v).toUpperCase();
const SEM = /^[0-9]{4}-(spring|summer|fall|winter)$/i;

/** -----------------------------------------------------------
 * helpers
 * ----------------------------------------------------------*/

// attach authorName if missing by joining uploaderEmail -> User.nickname
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
 * NEW: school-wide recent materials for dashboard preview
 * GET /api/:school/materials/recent?limit=5
 */
router.get("/recent", async (req, res) => {
  const school = low(req.params.school);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "5", 10)));

  let items = await Material.find({ school, status: { $ne: "archived" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // ✅ fill authorName if empty
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
      authorName: m.authorName, // already filled
      uploaderEmail: m.uploaderEmail, // kept for internal use; not for UI
      createdAt: m.createdAt,
    })),
  });
});

/**
 * List materials for a course & semester
 * GET /api/:school/materials
 */
router.get("/", async (req, res) => {
  const school = low(req.params.school);
  const courseCode = up(req.query.course || "");
  const semester = n(req.query.semester || "");
  const kind = n(req.query.kind || "all").toLowerCase();
  const materialType = n(req.query.materialType || "all");
  const hasIsFree = typeof req.query.isFree !== "undefined";
  const isFree = String(req.query.isFree || "").toLowerCase() === "true";
  const sort = n(req.query.sort || "new").toLowerCase();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));

  if (!courseCode) return res.status(400).json({ message: "course is required" });
  if (!semester || !SEM.test(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }

  const filter = { school, courseCode, semester };
  if (kind !== "all") filter.kind = kind;
  if (materialType !== "all") filter.materialType = materialType;
  if (hasIsFree) filter.isFree = isFree;

  let sortObj = { createdAt: -1 };
  if (sort === "top") sortObj = { likeCount: -1, createdAt: -1 };
  if (sort === "price") sortObj = { isFree: -1, price: 1, createdAt: -1 };

  let items = await Material.find(filter)
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // ✅ fill authorName if empty
  items = await attachAuthorNames(items);

  const total = await Material.countDocuments(filter);

  res.json({
    page,
    limit,
    total,
    items: items.map((m) => ({
      id: m._id,
      courseCode: m.courseCode,
      courseTitle: m.courseTitle,
      professor: m.professor || "",
      semester: m.semester,
      kind: m.kind,
      materialType: m.materialType,
      title: m.title,
      description: m.description || "", // ✅ 추가
      tags: m.tags,
      url: m.url,
      // 파일 필드는 응답에 남겨두되 프론트는 사용 X
      fileUrl: m.fileUrl,
      fileMime: m.fileMime,
      fileSize: m.fileSize,
      isFree: m.isFree,
      price: m.price,
      sharePreference: m.sharePreference,
      status: m.status,
      likeCount: m.likeCount,
      viewCount: m.viewCount,
      authorName: m.authorName, // already filled
      uploaderEmail: m.uploaderEmail, // kept
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  });
});

/**
 * Get a single material
 * GET /api/:school/materials/:id
 */
router.get("/:id", async (req, res) => {
  const school = low(req.params.school);
  const id = n(req.params.id);
  let doc = await Material.findOne({ _id: id, school }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });

  // ✅ fill authorName if empty
  doc = (await attachAuthorNames(doc)) || doc;

  res.json(doc);
});

/**
 * Create (no attachment required)
 * POST /api/:school/materials
 */
router.post("/", async (req, res) => {
  const school = low(req.params.school);
  const user = req.user;
  const body = req.body || {};

  const courseCode = up(body.courseCode || "");
  const courseTitle = n(body.courseTitle || "");
  const professor = n(body.professor || ""); // REQUIRED
  const semester = n(body.semester || "");
  let kind = n(body.kind || "note").toLowerCase();

  // 파일 업로드는 사용하지 않음. url은 선택적으로 허용.
  const url = n(body.url || "");

  const materialType = n(body.materialType || "personalMaterial");
  const isFree = typeof body.isFree === "boolean" ? body.isFree : true;
  const price = Number.isFinite(body.price) ? Math.max(0, body.price) : 0;
  const sharePreference = n(body.sharePreference || "either");

  // 본문 설명(선택)
  const description = n(body.description || "");

  if (!courseCode) return res.status(400).json({ message: "courseCode is required" });
  if (!semester || !SEM.test(semester)) return res.status(400).json({ message: "Invalid semester" });

  if (kind === "quiz") kind = "exam";
  if (!["note", "syllabus", "exam", "slide", "link", "other"].includes(kind)) {
    return res.status(400).json({ message: "invalid kind" });
  }

  if (!isFree && price < 1) return res.status(400).json({ message: "Price must be at least 1" });

  if (courseTitle) {
    await CourseCatalog.findOneAndUpdate(
      { school, code: courseCode },
      { $setOnInsert: { title: courseTitle } },
      { upsert: true, new: false }
    );
  }

  // ✅ robust authorName: use JWT nickname if present; otherwise DB lookup by email
  let authorName = n(user?.nickname || user?.name || "");
  if (!authorName && user?.email) {
    const u = await User.findOne({ email: low(user.email) }).select("nickname").lean();
    authorName = n(u?.nickname || "");
  }

  const doc = await Material.create({
    school,
    courseCode,
    courseTitle,
    professor,
    semester,
    kind,
    title: n(body.title || courseCode),
    description, // ✅ 저장
    tags: Array.isArray(body.tags) ? body.tags.map(n).filter(Boolean).slice(0, 12) : [],
    url,
    // 파일 필드는 더 이상 검증하지 않고 기본값(빈 값)만 저장
    fileUrl: n(body.fileUrl || ""),
    filePublicId: n(body.filePublicId || ""),
    fileMime: n(body.fileMime || ""),
    fileSize: Number.isFinite(body.fileSize) ? body.fileSize : 0,
    hash: n(body.hash || ""),
    materialType,
    isFree,
    price,
    sharePreference,
    status: "active",
    uploaderId: user?._id,
    uploaderEmail: low(user?.email || ""),
    authorName, // ✅ ensured
  });

  res.status(201).json({ ok: true, id: doc._id });
});

/**
 * Delete (owner or admin)
 * DELETE /api/:school/materials/:id
 */
router.delete("/:id", async (req, res) => {
  const school = low(req.params.school);
  const id = n(req.params.id);
  const user = req.user;

  const doc = await Material.findOne({ _id: id, school });
  if (!doc) return res.status(404).json({ message: "Not found" });

  const isOwner = String(doc.uploaderId || "") === String(user?._id || "");
  const isAdmin = (user?.role || "") === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  await doc.deleteOne();
  res.json({ ok: true });
});

module.exports = router;






