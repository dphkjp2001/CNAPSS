// backend/routes/reviews.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const mongoose = require("mongoose");
const Review = require("../models/Review");
const Professor = require("../models/Professor");
const CourseCatalog = require("../models/CourseCatalog");

/**
 * Notes:
 * - All endpoints are school-scoped. We rely on requireAuth + schoolGuard to attach req.user.school.
 * - Reviews are always for a (course, professor) pair.
 * - Public comment must NOT contain URLs. The Review model already enforces this; we also pre-check for friendly errors.
 */

// --- helpers ---
const URL_REGEX = /(https?:\/\/[^\s]+)/i;

function assertObjectId(id, fieldName = "id") {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${fieldName}.`);
    err.status = 400;
    throw err;
  }
}

async function assertCourseInSchool(courseId, school) {
  const course = await CourseCatalog.findById(courseId).lean();
  if (!course) {
    const err = new Error("Course not found.");
    err.status = 404;
    throw err;
  }
  // Course model is school-scoped in your app; if not, skip this check.
  if (course.school && String(course.school).toLowerCase() !== String(school).toLowerCase()) {
    const err = new Error("Course does not belong to your school.");
    err.status = 403;
    throw err;
  }
  return course;
}

async function assertProfessorInSchool(professorId, school) {
  const prof = await Professor.findById(professorId).lean();
  if (!prof) {
    const err = new Error("Professor not found.");
    err.status = 404;
    throw err;
  }
  if (String(prof.school).toLowerCase() !== String(school).toLowerCase()) {
    const err = new Error("Professor does not belong to your school.");
    err.status = 403;
    throw err;
  }
  return prof;
}

// --- middleware: all routes below require auth + school scope ---
router.use(requireAuth);
router.use(schoolGuard);

/**
 * POST /reviews
 * Create a review for a (course, professor) pair.
 * Body:
 * {
 *   courseId, professorId, term, overall, difficulty, workload,
 *   gradingStrictness, usefulness, wouldTakeAgain(Boolean), comment(String, no URLs)
 * }
 */
router.post("/", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const {
      courseId,
      professorId,
      term = "",
      overall,
      difficulty,
      workload,
      gradingStrictness,
      usefulness,
      wouldTakeAgain = false,
      comment = "",
    } = req.body || {};

    // Basic validations
    assertObjectId(courseId, "courseId");
    assertObjectId(professorId, "professorId");

    if (
      !overall || !difficulty || !workload || !gradingStrictness || !usefulness
    ) {
      return res.status(400).json({ error: "All rating fields are required." });
    }

    if (typeof comment === "string" && URL_REGEX.test(comment)) {
      return res.status(400).json({
        error: "Public comment cannot include external links. Share links only via DMs.",
      });
    }

    // Cross-check school scope
    await Promise.all([
      assertCourseInSchool(courseId, school),
      assertProfessorInSchool(professorId, school),
    ]);

    // Create
    const doc = await Review.create({
      school,
      course: courseId,
      professor: professorId,
      term: String(term || "").toLowerCase().trim(),
      overall,
      difficulty,
      workload,
      gradingStrictness,
      usefulness,
      wouldTakeAgain: !!wouldTakeAgain,
      comment: comment ? String(comment).trim() : "",
      author: req.user._id,
      isVerifiedEnrollment: false, // you can toggle later via verification flow
    });

    res.json(doc);
  } catch (err) {
    // Handle duplicate unique index (same user posting multiple times for the same combo)
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: "You have already submitted a review for this course/professor/term.",
      });
    }
    console.error("POST /reviews error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to create review" });
  }
});

/**
 * GET /reviews/course/:courseId/breakdown
 * Returns professor-by-course breakdown: compare professors who teach the same course.
 */
router.get("/course/:courseId/breakdown", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const { courseId } = req.params;
    assertObjectId(courseId, "courseId");
    await assertCourseInSchool(courseId, school);

    const rows = await Review.getCourseProfessorBreakdown({ school, courseId });
    res.json({ items: rows });
  } catch (err) {
    console.error("GET /reviews/course/:courseId/breakdown error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to load breakdown" });
  }
});

/**
 * GET /reviews/professor/:professorId/breakdown
 * Returns course-by-professor breakdown: see how a professor is rated across different courses.
 */
router.get("/professor/:professorId/breakdown", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const { professorId } = req.params;
    assertObjectId(professorId, "professorId");
    await assertProfessorInSchool(professorId, school);

    const rows = await Review.getProfessorCourseBreakdown({ school, professorId });
    res.json({ items: rows });
  } catch (err) {
    console.error("GET /reviews/professor/:professorId/breakdown error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to load breakdown" });
  }
});

/**
 * GET /reviews/course/:courseId/summary
 * Returns course-level overall averages across all professors.
 */
router.get("/course/:courseId/summary", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const { courseId } = req.params;
    assertObjectId(courseId, "courseId");
    await assertCourseInSchool(courseId, school);

    const row = await Review.getCourseOverallSummary({ school, courseId });
    res.json(row);
  } catch (err) {
    console.error("GET /reviews/course/:courseId/summary error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to load summary" });
  }
});

/**
 * GET /reviews/course/:courseId/list
 * Optional helper: list raw reviews for a course (optionally filter by professor)
 * Query: professorId?, page=1, limit=20
 */
router.get("/course/:courseId/list", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const { courseId } = req.params;
    const { professorId, page = 1, limit = 20 } = req.query;

    assertObjectId(courseId, "courseId");
    await assertCourseInSchool(courseId, school);

    const query = {
      school,
      course: courseId,
      isHidden: { $ne: true },
    };

    if (professorId) {
      assertObjectId(professorId, "professorId");
      await assertProfessorInSchool(professorId, school);
      query.professor = professorId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("professor", "name department")
        .populate("author", "username"),
      Review.countDocuments(query),
    ]);

    res.json({ items, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    console.error("GET /reviews/course/:courseId/list error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to list reviews" });
  }
});

/**
 * GET /reviews/professor/:professorId/list
 * Optional helper: list raw reviews for a professor (optionally filter by course)
 * Query: courseId?, page=1, limit=20
 */
router.get("/professor/:professorId/list", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const { professorId } = req.params;
    const { courseId, page = 1, limit = 20 } = req.query;

    assertObjectId(professorId, "professorId");
    await assertProfessorInSchool(professorId, school);

    const query = {
      school,
      professor: professorId,
      isHidden: { $ne: true },
    };

    if (courseId) {
      assertObjectId(courseId, "courseId");
      await assertCourseInSchool(courseId, school);
      query.course = courseId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("course", "code title")
        .populate("author", "username"),
      Review.countDocuments(query),
    ]);

    res.json({ items, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    console.error("GET /reviews/professor/:professorId/list error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to list reviews" });
  }
});

/**
 * POST /reviews/:id/hide
 * Author or admin can soft-hide their review.
 */
router.post("/:id/hide", async (req, res) => {
  try {
    const school = req.user.school?.toLowerCase();
    const { id } = req.params;
    const { reason } = req.body || {};
    assertObjectId(id, "id");

    const review = await Review.findOne({ _id: id, school });
    if (!review) return res.status(404).json({ error: "Not found" });

    const isAuthor = String(review.author) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isAuthor && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    review.isHidden = true;
    review.hiddenReason = reason || "hidden";
    await review.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /reviews/:id/hide error", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to hide review" });
  }
});

module.exports = router;
