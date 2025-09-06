// backend/routes/materials.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Material = require("../models/Material");
const CourseCatalog = require("../models/CourseCatalog");
const User = require("../models/User"); // for nickname lookup

const n = (v) => String(v || "").trim();
const low = (v) => n(v).toLowerCase();
const up = (v) => n(v).toUpperCase();
const SEM = /^[0-9]{4}-(spring|summer|fall|winter)$/i;

// safe regex
const escapeRe = (s) => n(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* helpers */
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

/** recent list for school (dashboard / list) */
router.get("/recent", async (req, res) => {
  const school = low(req.params.school);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "5", 10)));
  const q = n(req.query.q || "");
  const prof = n(req.query.prof || "");
  const type = n(req.query.type || "all").toLowerCase(); // ✅ sale|wanted|all

  const filter = { school, status: { $ne: "archived" } };
  if (q) {
    const r = new RegExp(escapeRe(q), "i");
    filter.$or = [{ courseCode: r }, { courseTitle: r }];
  }
  if (prof) {
    filter.professor = new RegExp(escapeRe(prof), "i");
  }
  if (type === "sale" || type === "wanted") {
    filter.listingType = type; // ✅
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
      authorName: m.authorName,
      uploaderEmail: m.uploaderEmail, // internal use only in FE
      listingType: m.listingType || "sale", // ✅
      createdAt: m.createdAt,
    })),
  });
});

/** list by course+semester */
router.get("/", async (req, res) => {
  const school = low(req.params.school);
  const courseCode = up(req.query.course || "");
  const semester = n(req.query.semester || "");
  const kind = n(req.query.kind || "all").toLowerCase();
  const materialType = n(req.query.materialType || "all");
  const hasIsFree = typeof req.query.isFree !== "undefined";
  const isFree = String(req.query.isFree || "").toLowerCase() === "true";
  const sort = n(req.query.sort || "new").toLowerCase();
  const type = n(req.query.type || "all").toLowerCase(); // ✅ sale|wanted|all
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
  if (type === "sale" || type === "wanted") filter.listingType = type; // ✅

  let sortObj = { createdAt: -1 };
  if (sort === "top") sortObj = { likeCount: -1, createdAt: -1 };
  if (sort === "price") sortObj = { isFree: -1, price: 1, createdAt: -1 };

  let items = await Material.find(filter)
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

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
      url: m.url,
      isFree: m.isFree,
      price: m.price,
      sharePreference: m.sharePreference,
      status: m.status,
      likeCount: m.likeCount,
      viewCount: m.viewCount,
      authorName: m.authorName,
      uploaderEmail: m.uploaderEmail,
      listingType: m.listingType || "sale", // ✅
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  });
});

/** get one */
router.get("/:id", async (req, res) => {
  const school = low(req.params.school);
  const id = n(req.params.id);
  let doc = await Material.findOne({ _id: id, school }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  doc = (await attachAuthorNames(doc)) || doc;
  res.json(doc); // listingType 포함 그대로 전달
});

/** create */
router.post("/", async (req, res) => {
  const school = low(req.params.school);
  const user = req.user;
  const body = req.body || {};

  const courseCode = up(body.courseCode || "");
  const courseTitle = n(body.courseTitle || "");
  const professor = n(body.professor || ""); // REQUIRED
  const semester = n(body.semester || "");
  let kind = n(body.kind || "").toLowerCase();
  const materialType = n(body.materialType || "personalMaterial");
  const isFree = typeof body.isFree === "boolean" ? body.isFree : true;
  const price = Number.isFinite(body.price) ? Math.max(0, body.price) : 0;
  const sharePreference = n(body.sharePreference || "either");
  const url = n(body.url || "");
  const listingType = ["sale", "wanted"].includes(n(body.listingType || "").toLowerCase())
    ? n(body.listingType).toLowerCase()
    : "sale"; // ✅ 기본 sale

  if (!courseCode) return res.status(400).json({ message: "courseCode is required" });
  if (!semester || !SEM.test(semester)) return res.status(400).json({ message: "Invalid semester" });

  if (materialType === "personalNote") {
    kind = "note";
  } else {
    const allowed = ["syllabus", "exam", "slide", "link", "other"];
    if (!allowed.includes(kind)) kind = "other";
  }

  if (!isFree && price < 1) return res.status(400).json({ message: "Price must be at least 1" });

  if (courseTitle) {
    await CourseCatalog.findOneAndUpdate(
      { school, code: courseCode },
      { $setOnInsert: { title: courseTitle } },
      { upsert: true, new: false }
    );
  }

  // author nickname
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
    description: "",
    tags: [],
    url,
    fileUrl: "",
    filePublicId: "",
    fileMime: "",
    fileSize: 0,
    hash: "",
    materialType,
    isFree,
    price,
    sharePreference,
    status: "active",
    listingType, // ✅
    uploaderId: user?._id,
    uploaderEmail: low(user?.email || ""),
    authorName,
  });

  res.status(201).json({ ok: true, id: doc._id });
});

/** delete (owner or admin) */
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









