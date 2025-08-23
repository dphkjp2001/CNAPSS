// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

const ALLOWED = ["nyu", "columbia", "boston"];
const norm = (s) => String(s || "").trim().toLowerCase();

// --- helpers -------------------------------------------------

// 1) 요청으로부터 "누가" 요청했는지 파악 (임시: 이메일 기반)
//    - header 'x-user-email' → body.email → query.email 순서로 추출
//    - 실제 운영에서는 JWT에서 req.user.email을 쓰는 게 정석이야(다음 단계에서 적용 가능)
async function resolveUser(req, { requireVerified = false } = {}) {
  const email =
    norm(req.headers["x-user-email"]) ||
    norm(req.body?.email) ||
    norm(req.query?.email);

  if (!email) return null;

  const user = await User.findOne({ email }).lean();
  if (!user) return null;

  if (requireVerified && !user.isVerified) return null;

  // school 안전 확보
  const school = norm(user.school);
  if (!school || !ALLOWED.includes(school)) return null;

  return { email: norm(user.email), nickname: user.nickname, school };
}

// --- routes --------------------------------------------------

// 📌 게시글 목록: 항상 "요청 사용자"의 학교로만 필터링
router.get("/", async (req, res) => {
  try {
    const me = await resolveUser(req);
    if (!me) {
      return res.status(401).json({ message: "User not resolved. Provide x-user-email or use auth." });
    }
    const posts = await Post.find({ school: me.school })
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (err) {
    console.error("List posts failed:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// ✅ 게시글 작성: 클라이언트의 school 값은 절대 사용하지 않음
router.post("/", async (req, res) => {
  try {
    const { title, content } = req.body || {};
    const me = await resolveUser(req, { requireVerified: true });

    if (!me) {
      return res.status(403).json({ message: "Only verified users can create posts." });
    }
    if (!title || !content) {
      return res.status(400).json({ message: "Missing fields." });
    }

    const doc = await Post.create({
      title: String(title).trim(),
      content: String(content).trim(),
      email: me.email,
      nickname: String(req.body?.nickname || "").trim() || me.nickname || "Anonymous",
      school: me.school, // <-- enforce from server
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Create post failed:", err);
    res.status(500).json({ message: "Failed to create post.", error: err.message });
  }
});

// 📌 게시글 상세: 사용자의 school과 문서 school이 일치해야 열람 가능
router.get("/:id", async (req, res) => {
  try {
    const me = await resolveUser(req);
    if (!me) {
      return res.status(401).json({ message: "User not resolved. Provide x-user-email or use auth." });
    }
    const post = await Post.findOne({ _id: req.params.id, school: me.school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    console.error("Get post failed:", err);
    res.status(500).json({ message: "Failed to fetch post." });
  }
});

// 📌 게시글 수정: 작성자 본인 + 같은 학교만
router.put("/:id", async (req, res) => {
  try {
    const me = await resolveUser(req, { requireVerified: true });
    if (!me) return res.status(403).json({ message: "Forbidden." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.school !== me.school) {
      return res.status(403).json({ message: "Cross-school access is not allowed." });
    }
    if (post.email !== me.email) {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    const { title, content } = req.body || {};
    if (title) post.title = String(title).trim();
    if (content) post.content = String(content).trim();
    await post.save();

    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("Update post failed:", err);
    res.status(500).json({ message: "Failed to update post.", error: err.message });
  }
});

// 📌 게시글 삭제: 작성자 본인 + 같은 학교만
router.delete("/:id", async (req, res) => {
  try {
    const me = await resolveUser(req, { requireVerified: true });
    if (!me) return res.status(403).json({ message: "Forbidden." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.school !== me.school) {
      return res.status(403).json({ message: "Cross-school access is not allowed." });
    }
    if (post.email !== me.email) {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    console.error("Delete post failed:", err);
    res.status(500).json({ message: "Failed to delete post.", error: err.message });
  }
});

// 📌 추천(좋아요) 토글: 같은 학교에서만 가능
router.post("/:id/thumbs", async (req, res) => {
  try {
    const me = await resolveUser(req, { requireVerified: true });
    if (!me) return res.status(403).json({ message: "Forbidden." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (post.school !== me.school) {
      return res.status(403).json({ message: "Cross-school access is not allowed." });
    }

    const i = post.thumbsUpUsers.indexOf(me.email);
    if (i >= 0) post.thumbsUpUsers.splice(i, 1);
    else post.thumbsUpUsers.push(me.email);

    await post.save();
    res.json({ thumbsUpCount: post.thumbsUpUsers.length });
  } catch (err) {
    console.error("Toggle like failed:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

// 📌 내가 좋아요 누른 글: 사용자 계정의 school로만 필터
router.get("/liked/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: norm(req.params.email) }).lean();
    if (!user || !user.school || !ALLOWED.includes(norm(user.school))) {
      return res.status(400).json({ message: "Invalid user or school." });
    }
    const school = norm(user.school);
    const email = norm(user.email);

    const likedPosts = await Post.find({ school, thumbsUpUsers: email })
      .sort({ createdAt: -1 })
      .lean();
    res.json(likedPosts);
  } catch (err) {
    console.error("Liked posts failed:", err);
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// 📌 내가 댓글 단 게시글: 댓글은 이메일로 찾고, 최종 포스트는 내 학교로 필터
router.get("/commented/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: norm(req.params.email) }).lean();
    if (!user || !user.school || !ALLOWED.includes(norm(user.school))) {
      return res.status(400).json({ message: "Invalid user or school." });
    }
    const school = norm(user.school);
    const email = norm(user.email);

    const comments = await Comment.find({ email }).lean();
    if (!comments.length) return res.json([]);

    const postIds = [...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean))];
    if (!postIds.length) return res.json([]);

    const posts = await Post.find({ _id: { $in: postIds }, school })
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (err) {
    console.error("Commented posts failed:", err);
    res.status(500).json({ message: "Failed to load commented posts.", error: err.message });
  }
});

module.exports = router;







