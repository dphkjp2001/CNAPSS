// backend/routes/materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const CourseCatalog = require("../models/CourseCatalog");
const User = require("../models/User");

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

// GET /api/:school/materials?course=CS-UY%201133&semester=2025-fall&kind=note|all&sort=new|top&page=1&limit=20
router.get("/", async (req, res) => {
  const school = low(req.params.school);
  const courseCode = up(req.query.course || "");
  const semester = n(req.query.semester || "");
  const kind = n(req.query.kind || "all").toLowerCase();
  const sort = n(req.query.sort || "new").toLowerCase();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));

  if (!courseCode) return res.status(400).json({ message: "course is required" });
  if (!semester || !SEM.test(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }

  const filter = { school, courseCode, semester };
  if (kind !== "all") filter.kind = kind;

  const sortObj = sort === "top" ? { likeCount: -1, createdAt: -1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Material.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Material.countDocuments(filter),
  ]);

  res.json({
    page,
    limit,
    total,
    items: items.map((m) => ({
      id: m._id,
      courseCode: m.courseCode,
      semester: m.semester,
      kind: m.kind,
      title: m.title,
      tags: m.tags,
      url: m.url,
      fileUrl: m.fileUrl,
      fileMime: m.fileMime,
      fileSize: m.fileSize,
      likeCount: m.likeCount,
      viewCount: m.viewCount,
      authorName: m.authorName,
      uploaderEmail: m.uploaderEmail,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  });
});

// GET /api/:school/materials/:id
router.get("/:id", async (req, res) => {
  const school = low(req.params.school);
  const id = n(req.params.id);
  const doc = await Material.findOne({ _id: id, school }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

// POST /api/:school/materials
// body: { courseCode, semester, kind, title, tags?, url?, fileUrl?, filePublicId?, fileMime?, fileSize?, hash?, courseTitle? }
router.post("/", async (req, res) => {
  const school = low(req.params.school);
  const user = req.user; // from requireAuth
  const body = req.body || {};

  const courseCode = up(body.courseCode || "");
  const courseTitle = n(body.courseTitle || "");
  const semester = n(body.semester || "");
  const kind = n(body.kind || "note").toLowerCase();
  const title = n(body.title || "");
  const tags = Array.isArray(body.tags) ? body.tags.map(n).filter(Boolean).slice(0, 12) : [];
  const url = n(body.url || "");
  const fileUrl = n(body.fileUrl || "");
  const filePublicId = n(body.filePublicId || "");
  const fileMime = n(body.fileMime || "");
  const fileSize = Number.isFinite(body.fileSize) ? body.fileSize : 0;
  const hash = n(body.hash || "");

  if (!courseCode) return res.status(400).json({ message: "courseCode is required" });
  if (!semester || !SEM.test(semester)) {
    return res.status(400).json({ message: "Invalid semester (e.g., 2025-fall)" });
  }
  if (!title) return res.status(400).json({ message: "title is required" });
  if (!["note", "syllabus", "exam", "slide", "link", "other"].includes(kind)) {
    return res.status(400).json({ message: "invalid kind" });
  }

  // At least one of (fileUrl|url) must be provided
  if (!fileUrl && !url) {
    return res.status(400).json({ message: "Provide fileUrl (Cloudinary) or external url" });
  }

  // Validate file metadata if present
  if (fileUrl) {
    if (fileSize > MAX_SIZE) return res.status(400).json({ message: "File too large" });
    if (fileMime && !ALLOWED_MIME.has(fileMime)) {
      return res.status(400).json({ message: "File type not allowed" });
    }
  }

  // Ensure course exists minimally in catalog (best-effort)
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
    semester,
    kind,
    title,
    tags,
    url,
    fileUrl,
    filePublicId,
    fileMime,
    fileSize,
    hash,
    uploaderId: user?._id,
    uploaderEmail: (user?.email || "").toLowerCase(),
    authorName: user?.nickname || user?.name || "",
  });

  res.status(201).json({ ok: true, id: doc._id });
});

// (optional) DELETE /api/:school/materials/:id  (owner/admin only)
router.delete("/:id", async (req, res) => {
  const school = low(req.params.school);
  const id = n(req.params.id);
  const user = req.user;

  const doc = await Material.findOne({ _id: id, school });
  if (!doc) return res.status(404).json({ message: "Not found" });

  const isOwner = String(doc.uploaderId || "") === String(user?._id || "");
  const isAdmin = (user?.role || "") === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  // (If you want: also remove from Cloudinary using filePublicId via your util)
  // const deleteFromCloudinary = require("../utils/deleteFromCloudinary");
  // if (doc.filePublicId) await deleteFromCloudinary(doc.filePublicId);

  await doc.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
