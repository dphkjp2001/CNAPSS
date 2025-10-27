// backend/scripts/recountComments.js
/**
 * Recount commentCount for Post & AcademicPost from Comment collection.
 * Safe: only counts comments whose `school` matches the post's `school`.
 * Options:
 *   --school=<key>   (e.g., --school=nyu)
 *   --dry-run        (log only)
 */

const path = require("path");
const mongoose = require("mongoose");
try { require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") }); } catch (_) {}

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const AcademicPost = require("../models/AcademicPost");

function args() {
  const o = { school: null, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--school=")) o.school = String(a.split("=")[1]).toLowerCase();
    if (a === "--dry-run") o.dryRun = true;
  }
  return o;
}

async function bulk(Model, ops, size = 1000) {
  let n = 0;
  for (let i = 0; i < ops.length; i += size) {
    const slice = ops.slice(i, i + size);
    if (slice.length) {
      await Model.bulkWrite(slice, { ordered: false });
      n += slice.length;
    }
  }
  return n;
}

async function main() {
  const { school, dryRun } = args();
  if (!process.env.MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Mongo connected");

  const postFilter = school ? { school } : {};
  const acadFilter = school ? { school } : {};

  // id -> school 맵을 만들어서 comment와 school이 일치하는 것만 집계
  const [posts, acads] = await Promise.all([
    Post.find(postFilter, { _id: 1, school: 1 }).lean(),
    AcademicPost.find(acadFilter, { _id: 1, school: 1 }).lean(),
  ]);
  const postSchool = new Map(posts.map((p) => [String(p._id), p.school]));
  const acadSchool = new Map(acads.map((p) => [String(p._id), p.school]));

  // 댓글을 postId+school로 그룹핑
  const commentMatch = school ? { school } : {};
  const grouped = await Comment.aggregate([
    { $match: commentMatch },
    { $group: { _id: { postId: "$postId", school: "$school" }, n: { $sum: 1 } } },
  ]);

  // reset 계획
  if (!dryRun) {
    console.log("✳️ Reset commentCount to 0 …");
    await Promise.all([
      Post.updateMany(postFilter, { $set: { commentCount: 0 } }),
      AcademicPost.updateMany(acadFilter, { $set: { commentCount: 0 } }),
    ]);
  }

  // 실제 업데이트 목록 구성 (school 일치 검증)
  const postOps = [];
  const acadOps = [];
  for (const g of grouped) {
    const id = String(g._id.postId);
    const sch = String(g._id.school || "");
    if (postSchool.get(id) === sch) {
      postOps.push({ updateOne: { filter: { _id: g._id.postId }, update: { $set: { commentCount: g.n } } } });
    } else if (acadSchool.get(id) === sch) {
      acadOps.push({ updateOne: { filter: { _id: g._id.postId }, update: { $set: { commentCount: g.n } } } });
    }
  }

  if (dryRun) {
    console.log("🧪 DRY-RUN — no writes");
    console.log(`Would apply Post=${postOps.length}, AcademicPost=${acadOps.length}`);
  } else {
    console.log("✳️ Writing recalculated counts …");
    const a = await bulk(Post, postOps);
    const b = await bulk(AcademicPost, acadOps);
    console.log(`✅ Applied — Post: ${a}, AcademicPost: ${b}`);
  }

  // 샘플 프린트
  const [sampleP, sampleA] = await Promise.all([
    Post.find(postFilter, { title: 1, school: 1, commentCount: 1 }).sort({ updatedAt: -1 }).limit(5).lean(),
    AcademicPost.find(acadFilter, { title: 1, school: 1, commentCount: 1 }).sort({ updatedAt: -1 }).limit(5).lean(),
  ]);
  console.log("🔎 Sample Post:", sampleP);
  console.log("🔎 Sample AcademicPost:", sampleA);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

