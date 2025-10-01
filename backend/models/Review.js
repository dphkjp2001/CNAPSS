// backend/models/Review.js
const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    // --- Multi-tenancy scope ---
    school: { type: String, required: true, lowercase: true, trim: true, index: true },

    // --- Relations ---
    course: { type: mongoose.Schema.Types.ObjectId, ref: "CourseCatalog", required: true, index: true },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: "Professor", required: true, index: true },

    // Academic term like "2025-fall" (align with CourseCatalog.semesters convention)
    term: { type: String, default: "", lowercase: true, trim: true, index: true },

    // --- Ratings (1~5) and signals ---
    overall: { type: Number, min: 1, max: 5, required: true },
    difficulty: { type: Number, min: 1, max: 5, required: true },
    workload: { type: Number, min: 1, max: 5, required: true },
    gradingStrictness: { type: Number, min: 1, max: 5, required: true }, // higher = stricter
    usefulness: { type: Number, min: 1, max: 5, required: true },
    wouldTakeAgain: { type: Boolean, default: false },

    // Short, link-free comment (public field: no URLs)
    comment: { type: String, default: "", maxlength: 2000 },

    // Reviewer
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // You can mark if the user verified course enrollment later (optional)
    isVerifiedEnrollment: { type: Boolean, default: false },

    // Moderation
    isHidden: { type: Boolean, default: false },
    hiddenReason: { type: String, default: null },
  },
  { timestamps: true }
);

// To avoid spam: one user should not post unlimited dup reviews for same (course, professor, term).
// This allows one per combo per user (tune as you like).
ReviewSchema.index(
  { school: 1, course: 1, professor: 1, term: 1, author: 1 },
  { unique: true }
);

// Fast queries
ReviewSchema.index({ school: 1, professor: 1 });
ReviewSchema.index({ school: 1, course: 1 });

// --- Utilities: block URLs in public comment (policy: no links in public fields) ---
const URL_REGEX = /(https?:\/\/[^\s]+)/i;
ReviewSchema.pre("validate", function (next) {
  if (this.comment && URL_REGEX.test(this.comment)) {
    return next(new Error("Public comment cannot include external links. Share links only via DMs."));
  }
  next();
});

// --- Static helpers for aggregation (you’ll call these in routes later) ---

/**
 * Aggregate course-level view grouped by professor.
 * Returns per-professor stats for the given course within a school.
 */
ReviewSchema.statics.getCourseProfessorBreakdown = async function ({
  school,
  courseId,
}) {
  const match = {
    school: school.toLowerCase(),
    course: new mongoose.Types.ObjectId(courseId),
    isHidden: { $ne: true },
  };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: "$professor",
        count: { $sum: 1 },
        overallAvg: { $avg: "$overall" },
        difficultyAvg: { $avg: "$difficulty" },
        workloadAvg: { $avg: "$workload" },
        gradingStrictnessAvg: { $avg: "$gradingStrictness" },
        usefulnessAvg: { $avg: "$usefulness" },
        wouldTakeAgainRate: { $avg: { $cond: ["$wouldTakeAgain", 1, 0] } },
      },
    },
    { $sort: { overallAvg: -1, count: -1 } },
    {
      $lookup: {
        from: "professors",
        localField: "_id",
        foreignField: "_id",
        as: "prof",
      },
    },
    { $unwind: "$prof" },
    {
      $project: {
        _id: 0,
        professor: {
          _id: "$prof._id",
          name: "$prof.name",
          department: "$prof.department",
        },
        count: 1,
        overallAvg: { $round: ["$overallAvg", 2] },
        difficultyAvg: { $round: ["$difficultyAvg", 2] },
        workloadAvg: { $round: ["$workloadAvg", 2] },
        gradingStrictnessAvg: { $round: ["$gradingStrictnessAvg", 2] },
        usefulnessAvg: { $round: ["$usefulnessAvg", 2] },
        wouldTakeAgainRate: { $round: ["$wouldTakeAgainRate", 3] }, // 0~1
      },
    },
  ];

  return this.aggregate(pipeline);
};

/**
 * Aggregate professor-level view grouped by course.
 * Returns per-course stats for the given professor within a school.
 */
ReviewSchema.statics.getProfessorCourseBreakdown = async function ({
  school,
  professorId,
}) {
  const match = {
    school: school.toLowerCase(),
    professor: new mongoose.Types.ObjectId(professorId),
    isHidden: { $ne: true },
  };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: "$course",
        count: { $sum: 1 },
        overallAvg: { $avg: "$overall" },
        difficultyAvg: { $avg: "$difficulty" },
        workloadAvg: { $avg: "$workload" },
        gradingStrictnessAvg: { $avg: "$gradingStrictness" },
        usefulnessAvg: { $avg: "$usefulness" },
        wouldTakeAgainRate: { $avg: { $cond: ["$wouldTakeAgain", 1, 0] } },
      },
    },
    { $sort: { overallAvg: -1, count: -1 } },
    {
      $lookup: {
        from: "coursecatalogs",
        localField: "_id",
        foreignField: "_id",
        as: "course",
      },
    },
    { $unwind: "$course" },
    {
      $project: {
        _id: 0,
        course: {
          _id: "$course._id",
          code: "$course.code",
          title: "$course.title",
        },
        count: 1,
        overallAvg: { $round: ["$overallAvg", 2] },
        difficultyAvg: { $round: ["$difficultyAvg", 2] },
        workloadAvg: { $round: ["$workloadAvg", 2] },
        gradingStrictnessAvg: { $round: ["$gradingStrictnessAvg", 2] },
        usefulnessAvg: { $round: ["$usefulnessAvg", 2] },
        wouldTakeAgainRate: { $round: ["$wouldTakeAgainRate", 3] }, // 0~1
      },
    },
  ];

  return this.aggregate(pipeline);
};

/**
 * Aggregate course-level overall (across all professors).
 */
ReviewSchema.statics.getCourseOverallSummary = async function ({ school, courseId }) {
  const match = {
    school: school.toLowerCase(),
    course: new mongoose.Types.ObjectId(courseId),
    isHidden: { $ne: true },
  };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        overallAvg: { $avg: "$overall" },
        difficultyAvg: { $avg: "$difficulty" },
        workloadAvg: { $avg: "$workload" },
        gradingStrictnessAvg: { $avg: "$gradingStrictness" },
        usefulnessAvg: { $avg: "$usefulness" },
        wouldTakeAgainRate: { $avg: { $cond: ["$wouldTakeAgain", 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        overallAvg: { $round: ["$overallAvg", 2] },
        difficultyAvg: { $round: ["$difficultyAvg", 2] },
        workloadAvg: { $round: ["$workloadAvg", 2] },
        gradingStrictnessAvg: { $round: ["$gradingStrictnessAvg", 2] },
        usefulnessAvg: { $round: ["$usefulnessAvg", 2] },
        wouldTakeAgainRate: { $round: ["$wouldTakeAgainRate", 3] },
      },
    },
  ];

  const [row] = await this.aggregate(pipeline);
  return row || {
    count: 0,
    overallAvg: null,
    difficultyAvg: null,
    workloadAvg: null,
    gradingStrictnessAvg: null,
    usefulnessAvg: null,
    wouldTakeAgainRate: null,
  };
};

module.exports = mongoose.model("Review", ReviewSchema);


