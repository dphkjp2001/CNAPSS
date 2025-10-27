// backend/scripts/recountComments.js
/**
 * Recount commentCount for Post & AcademicPost from Comment collection.
 * - Default: process all schools
 * - Options:
 *   --school=<key>   (e.g., --school=nyu)
 *   --dry-run        (do not write; just log)
 *
 * Usage:
 *   node scripts/recountComments.js
 *   node scripts/recountComments.js --school=nyu
 *   node scripts/recountComments.js --school=nyu --dry-run
 */

const path = require("path");
const mongoose = require("mongoose");

// Try to load local .env when running outside Render
try {
  require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
} catch (_) {}

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const AcademicPost = require("../models/AcademicPost");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { school: null, dryRun: false };
  for (const a of args) {
    if (a.startsWith("--school=")) out.school = String(a.split("=")[1]).toLowerCase();
    if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function chunkedBulkWrite(Model, ops, size = 1000) {
  let applied = 0;
  for (let i = 0; i < ops.length; i += size) {
    const slice = ops.slice(i, i + size);
    if (slice.length) {
      await Model.bulkWrite(slice, { ordered: false });
      applied += slice.length;
    }
  }
  return applied;
}

async function main() {
  const { school, dryRun } = parseArgs();

  if (!process.env.MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI env.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const schoolFilter = school ? { school } : {};
  console.log(
    `➡️  Recounting commentCount ${school ? `for school="${school}"` : "(all schools)"}${dryRun ? " [DRY-RUN]" : ""}`
  );

  // 0) Load id->school maps so we know which collection a comment's postId lives in
  console.log("🔎 Loading post id maps...");
  const [freeMapArr, acadMapArr] = await Promise.all([
    Post.find(schoolFilter, { _id: 1, school: 1 }).lean(),
    AcademicPost.find(schoolFilter, { _id: 1, school: 1 }).lean(),
  ]);
  const freeSet = new Set(freeMapArr.map((d) => String(d._id)));
  const acadSet = new Set(acadMapArr.map((d) => String(d._id)));
  console.log(
    `   ↳ posts: ${freeSet.size.toLocaleString()}, academicPosts: ${acadSet.size.toLocaleString()}`
  );

  // 1) Aggregate real counts from comments (group by postId, school)
  console.log("🧮 Aggregating counts from comments...");
  const commentMatch = school ? { school } : {};
  const grouped = await Comment.aggregate([
    { $match: commentMatch },
    {
      $group: {
        _id: { postId: "$postId", school: "$school" },
        n: { $sum: 1 },
      },
    },
  ]);

  // 2) Prepare operations
  //    We will reset all commentCount to 0 for the chosen scope, then put actual numbers.
  console.log("🧹 Preparing reset to 0 (so stale counts disappear)...");
  const resetFreeFilter = school ? { school } : {};
  const resetAcadFilter = school ? { school } : {};

  // 3) Build $set ops using aggregation result
  const freeOps = [];
  const acadOps = [];
  for (const g of grouped) {
    const postId = String(g._id.postId);
    const n = g.n;
    if (freeSet.has(postId)) {
      freeOps.push({
        updateOne: {
          filter: { _id: g._id.postId },
          update: { $set: { commentCount: n } },
        },
      });
    } else if (acadSet.has(postId)) {
      acadOps.push({
        updateOne: {
          filter: { _id: g._id.postId },
          update: { $set: { commentCount: n } },
        },
      });
    }
  }

  // 4) Apply
  if (dryRun) {
    console.log("🧪 DRY-RUN MODE — No writes will be made.");
    console.log(`   Will reset Post & AcademicPost commentCount to 0 in scope: ${school || "ALL"}`);
    console.log(`   Will apply ${freeOps.length} Post updates and ${acadOps.length} AcademicPost updates.`);
  } else {
    console.log("✳️ Resetting commentCount to 0...");
    await Promise.all([
      Post.updateMany(resetFreeFilter, { $set: { commentCount: 0 } }),
      AcademicPost.updateMany(resetAcadFilter, { $set: { commentCount: 0 } }),
    ]);

    console.log("✳️ Writing recalculated counts (bulk)...");
    const appliedFree = await chunkedBulkWrite(Post, freeOps);
    const appliedAcad = await chunkedBulkWrite(AcademicPost, acadOps);

    console.log(`✅ Done. Applied updates — Post: ${appliedFree}, AcademicPost: ${appliedAcad}`);
  }

  // 5) Summary preview
  const previewLimit = 5;
  const [sampleFree, sampleAcad] = await Promise.all([
    Post.find(schoolFilter, { title: 1, commentCount: 1 }).sort({ updatedAt: -1 }).limit(previewLimit).lean(),
    AcademicPost.find(schoolFilter, { title: 1, commentCount: 1 }).sort({ updatedAt: -1 }).limit(previewLimit).lean(),
  ]);
  console.log("🔎 Sample (Post):", sampleFree);
  console.log("🔎 Sample (AcademicPost):", sampleAcad);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Recount failed:", e);
  process.exit(1);
});
