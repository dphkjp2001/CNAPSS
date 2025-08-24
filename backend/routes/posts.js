// // backend/routes/posts.js
// const express = require("express");
// const router = express.Router();
// const Post = require("../models/Post");
// const User = require("../models/User");
// const Comment = require("../models/Comment"); // 


// // 📌 게시글 목록 가져오기
// router.get("/", async (req, res) => {
//   try {
//     const posts = await Post.find().sort({ createdAt: -1 });
//     res.json(posts);
//   } catch (err) {
//     res.status(500).json({ message: "Failed to load posts." });
//   }
// });


// // ✅ 게시글 작성
// router.post("/", async (req, res) => {
//   const { email, title, content } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user || !user.isVerified) {
//       return res.status(403).json({ message: "Only verified users can create posts." });
//     }

//     const newPost = new Post({
//       title,
//       content,
//       email: user.email,
//       nickname: user.nickname,
//     });

//     await newPost.save();
//     res.status(201).json(newPost);
//   } catch (err) {
//     console.error("게시글 작성 오류:", err);
//     res.status(500).json({ message: "Failed to create post.", error: err.message });
//   }
// });

// // 📌 게시글 수정
// router.put("/:id", async (req, res) => {
//   const { email, title, content } = req.body;
//   const { id } = req.params;

//   try {
//     const post = await Post.findById(id);
//     if (!post) return res.status(404).json({ message: "Post not found." });

//     if (post.email !== email) {
//       return res.status(403).json({ message: "You can only edit your own posts." });
//     }

//     post.title = title;
//     post.content = content;
//     await post.save();

//     res.json({ message: "Post updated successfully.", post });
//   } catch (err) {
//     console.error("수정 오류:", err);
//     res.status(500).json({ message: "Failed to update post.", error: err.message });
//   }
// });


// // 📌 게시글 상세 조회
// router.get("/:id", async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id).lean();
//     if (!post) {
//       return res.status(404).json({ message: "Post not found." });
//     }

//     console.log("🔍 게시글 email:", post.email);

//     res.json({
//       ...post,
//       email: post.email,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch post." });
//   }
// });


// // 📌 게시글 삭제
// router.delete("/:id", async (req, res) => {
//   const { email } = req.body;
//   const { id } = req.params;

//   try {
//     const post = await Post.findById(id);
//     if (!post) return res.status(404).json({ message: "Post not found." });

//     if (post.email !== email) {
//       return res.status(403).json({ message: "You can only delete your own posts." });
//     }

//     await Post.findByIdAndDelete(id);
//     res.json({ message: "Post deleted successfully." });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to delete post.", error: err.message });
//   }
// });

// // 📌 추천 토글 API
// router.post("/:id/thumbs", async (req, res) => {
//   const { email } = req.body;
//   const { id } = req.params;

//   try {
//     const post = await Post.findById(id);
//     if (!post) return res.status(404).json({ message: "Post not found." });

//     const alreadyLiked = post.thumbsUpUsers.includes(email);

//     if (alreadyLiked) {
//       post.thumbsUpUsers = post.thumbsUpUsers.filter((e) => e !== email); // 👍 취소
//     } else {
//       post.thumbsUpUsers.push(email); // 👍 추가
//     }

//     await post.save();
//     res.json({ thumbsUpCount: post.thumbsUpUsers.length });
//   } catch (err) {
//     console.error("게시물 추천 실패:", err);
//     res.status(500).json({ message: "Failed to toggle like." });
//   }
// });


// // 내가 좋아요 누른 글
// router.get("/liked/:email", async (req, res) => {
//   const { email } = req.params;
//   try {
//     const likedPosts = await Post.find({ thumbsUpUsers: email }).sort({ createdAt: -1 });
//     res.json(likedPosts);
//   } catch (err) {
//     res.status(500).json({ message: "Failed to load liked posts." });
//   }
// });



// // 내가 댓글 단 게시글 가져오기
// router.get("/commented/:email", async (req, res) => {
//   const { email } = req.params;
  
//   try {
//     const comments = await Comment.find({ email });

//     if (!comments || comments.length === 0) {
//       return res.json([]); // 댓글이 없다면 빈 배열 응답
//     }

//     const postIds = [...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean))];

//     if (postIds.length === 0) {
//       return res.json([]);
//     }

//     const posts = await Post.find({ _id: { $in: postIds } }).sort({ createdAt: -1 });
//     res.json(posts);
//   } catch (err) {
//     console.error("❌ CommentedPosts 에러:", err);
//     res.status(500).json({ message: "Failed to load commented posts.", error: err.message });
//   }
// });

// module.exports = router;


// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

// 🔒 모든 posts 라우트 보호 + 테넌트 일치 강제
router.use(requireAuth, schoolGuard);

// 📌 게시글 목록 (내 학교만)
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find({ school: req.user.school }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Failed to load posts:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// 👍 내가 좋아요 누른 글 (본인만 허용 또는 superadmin)  ※ :id 충돌 방지 위해 위에 둠
router.get("/liked/:email", async (req, res) => {
  const paramEmail = String(req.params.email).toLowerCase().trim();
  if (req.user.role !== "superadmin" && paramEmail !== req.user.email) {
    return res.status(403).json({ message: "Forbidden." });
  }
  try {
    const likedPosts = await Post.find({
      thumbsUpUsers: paramEmail,
      school: req.user.school,
    }).sort({ createdAt: -1 });
    res.json(likedPosts);
  } catch (err) {
    console.error("Load liked posts error:", err);
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// 💬 내가 댓글 단 게시글 (본인만 허용 또는 superadmin)
router.get("/commented/:email", async (req, res) => {
  const paramEmail = String(req.params.email).toLowerCase().trim();
  if (req.user.role !== "superadmin" && paramEmail !== req.user.email) {
    return res.status(403).json({ message: "Forbidden." });
  }
  try {
    const comments = await Comment.find({ email: paramEmail, school: req.user.school });
    if (!comments?.length) return res.json([]);

    const postIds = [...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean))];
    if (!postIds.length) return res.json([]);

    const posts = await Post.find({
      _id: { $in: postIds },
      school: req.user.school,
    }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("Load commented posts error:", err);
    res.status(500).json({ message: "Failed to load commented posts.", error: err.message });
  }
});

// 📌 게시글 상세 (내 학교 스코프)
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    console.error("Fetch post error:", err);
    res.status(500).json({ message: "Failed to fetch post." });
  }
});

// ✅ 게시글 작성 (req.user 사용, 클라이언트 email 무시)
router.post("/", async (req, res) => {
  const { title, content } = req.body;
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user || !user.isVerified) {
      return res.status(403).json({ message: "Only verified users can create posts." });
    }

    const newPost = new Post({
      title,
      content,
      email: req.user.email,
      nickname: user.nickname,
      school: req.user.school, // 🔐 서버가 주입
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post.", error: err.message });
  }
});

// ✏️ 게시글 수정 (작성자 본인 + 같은 학교)
router.put("/:id", async (req, res) => {
  const { title, content } = req.body;
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    post.title = title;
    post.content = content;
    await post.save();
    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ message: "Failed to update post.", error: err.message });
  }
});

// 🗑️ 게시글 삭제 (작성자 본인 + 같은 학교)
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await Post.deleteOne({ _id: post._id });
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post.", error: err.message });
  }
});

// 👍 추천 토글 (내 학교 + 내 계정)
router.post("/:id/thumbs", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    const me = req.user.email;
    const alreadyLiked = (post.thumbsUpUsers || []).includes(me);

    if (alreadyLiked) {
      post.thumbsUpUsers = post.thumbsUpUsers.filter((e) => e !== me);
    } else {
      post.thumbsUpUsers = [...(post.thumbsUpUsers || []), me];
    }

    await post.save();
    res.json({ thumbsUpCount: post.thumbsUpUsers.length });
  } catch (err) {
    console.error("Toggle like error:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

module.exports = router;


