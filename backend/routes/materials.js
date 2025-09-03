// backend/routes/materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const CourseCatalog = require("../models/CourseCatalog");

const n = (v) => String(v || "").trim();
const low = (v) => n(v).toLowerCase();
const up = (v) => n(v).toUpperCase();
const SEM = /^[0-9]{4}-(spring|summer|fall|winter)$/i;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * NEW: school-wide recent materials for dashboard preview
 * GET /api/:school/materials/recent?limit=5
 */
router.get("/recent", async (req, res) => {
  const school = low(req.params.school);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "5", 10)));

  const items = await Material.find({ school, status: { $ne: "archived" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

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
      authorName: m.authorName,
      uploaderEmail: m.uploaderEmail,
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

  const [items, total] = await Promise.all([
    Material.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit).lean(),
    Material.countDocuments(filter),
  ]);

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
      tags: m.tags,
      url: m.url,
      fileUrl: m.fileUrl,
      fileMime: m.fileMime,
      fileSize: m.fileSize,
      isFree: m.isFree,
      price: m.price,
      sharePreference: m.sharePreference,
      status: m.status,
      likeCount: m.likeCount,
      viewCount: m.viewCount,
      authorName: m.authorName,
      uploaderEmail: m.uploaderEmail,
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
  const doc = await Material.findOne({ _id: id, school }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
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
  const professor = n(body.professor || ""); // NEW
  const semester = n(body.semester || "");
  let kind = n(body.kind || "note").toLowerCase();

  const url = n(body.url || "");
  const fileUrl = n(body.fileUrl || "");
  const filePublicId = n(body.filePublicId || "");
  const fileMime = n(body.fileMime || "");
  const fileSize = Number.isFinite(body.fileSize) ? body.fileSize : 0;
  const hash = n(body.hash || "");

  const materialType = n(body.materialType || "personalMaterial");
  const isFree = typeof body.isFree === "boolean" ? body.isFree : true;
  const price = Number.isFinite(body.price) ? Math.max(0, body.price) : 0;
  const sharePreference = n(body.sharePreference || "either");

  if (!courseCode) return res.status(400).json({ message: "courseCode is required" });
  if (!semester || !SEM.test(semester)) return res.status(400).json({ message: "Invalid semester" });

  if (kind === "quiz") kind = "exam";
  if (!["note", "syllabus", "exam", "slide", "link", "other"].includes(kind)) {
    return res.status(400).json({ message: "invalid kind" });
  }

  if (fileUrl) {
    if (fileSize > MAX_SIZE) return res.status(400).json({ message: "File too large" });
    if (fileMime && !ALLOWED_MIME.has(fileMime)) return res.status(400).json({ message: "File type not allowed" });
  }

  if (!isFree && price < 1) return res.status(400).json({ message: "Price must be at least 1" });

  if (courseTitle) {
    await CourseCatalog.findOneAndUpdate(
      { school, code: courseCode },
      { $setOnInsert: { title: courseTitle } },
      { upsert: true, new: false }
    );
  }

  const doc = await Material.create({
    school,
    courseCode,
    courseTitle,
    professor, // NEW
    semester,
    kind,
    title: n(body.title || courseCode),
    tags: Array.isArray(body.tags) ? body.tags.map(n).filter(Boolean).slice(0, 12) : [],
    url,
    fileUrl,
    filePublicId,
    fileMime,
    fileSize,
    hash,
    materialType,
    isFree,
    price,
    sharePreference,
    status: "active",
    uploaderId: user?._id,
    uploaderEmail: (user?.email || "").toLowerCase(),
    authorName: user?.nickname || user?.name || "",
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




