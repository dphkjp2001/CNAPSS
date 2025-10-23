// backend/scripts/seedDummyData.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "./.env" });

const User = require("../models/User");
const Post = require("../models/Post");
const AcademicPost = require("../models/AcademicPost");
const Comment = require("../models/Comment");

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI in .env");
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Mongo connection error:", err);
    process.exit(1);
  }
}

async function clearExisting() {
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  console.log("🧹 Cleared existing data");
}

async function clearExistingPostsAndComments() {
    await Post.deleteMany({});
    await AcademicPost.deleteMany({});
    await Comment.deleteMany({});
    console.log("🧹 Cleared existing posts and comments");
}

async function seedDummyUsers() {
  const dummyUsers = [
    {
      email: "alice@nyu.edu",
      password: await bcrypt.hash("password123", 10),
      nickname: "AliceK",
      school: "nyu",
      isVerified: true,
      classOf: 2026,
    },
    {
      email: "brian@columbia.edu",
      password: await bcrypt.hash("password123", 10),
      nickname: "BrianP",
      school: "columbia",
      isVerified: true,
      classOf: 2025,
    },
    {
      email: "cindy@boston.edu",
      password: await bcrypt.hash("password123", 10),
      nickname: "CindyL",
      school: "boston",
      isVerified: false,
      classOf: 2027,
    },
  ];

  const users = await User.insertMany(dummyUsers);
  console.log(`👥 Created ${users.length} users`);
  return users;
}

async function seedDummyPosts(users) {
  const dummyPosts = [
    {
      school: "nyu",
      board: "free",
      title: "Best study spots near Bobst?",
      content: "Looking for quiet but not too dead places to work!",
      author: users[0]._id,
      anonymous: false,
      counts: { up: 5, down: 1 },
    },
    {
      school: "columbia",
      board: "academic",
      mode: "looking_for",
      title: "Need study partner for ML midterm",
      content: "Anyone in COMS 4771 want to team up?",
      author: users[1]._id,
      anonymous: false,
      counts: { up: 3, down: 0 },
    },
    {
      school: "boston",
      board: "free",
      title: "Where to find good cheap eats near campus?",
      content: "I’m new here, please drop recommendations 🙏",
      author: users[2]._id,
      anonymous: true,
      counts: { up: 2, down: 0 },
    },
  ];

  const posts = await Post.insertMany(dummyPosts);
  console.log(`📝 Created ${posts.length} posts`);
  return posts;
}

async function seedDummyComments(users, posts) {
  const dummyComments = [
    {
      postId: posts[0]._id,
      school: "nyu",
      authorId: users[1]._id,
      email: users[1].email,
      nickname: users[1].nickname,
      content: "Try the 8th floor of Kimmel — underrated spot.",
    },
    {
      postId: posts[0]._id,
      school: "nyu",
      authorId: users[2]._id,
      email: users[2].email,
      nickname: users[2].nickname,
      content: "Third floor of Bobst is quiet but not totally dead.",
    },
    {
      postId: posts[1]._id,
      school: "columbia",
      authorId: users[0]._id,
      email: users[0].email,
      nickname: users[0].nickname,
      content: "Good luck! I took it last year — tough but fair.",
    },
  ];

  const comments = await Comment.insertMany(dummyComments);
  console.log(`💬 Created ${comments.length} comments`);
}

async function main() {
  await connectDB();
  await clearExistingPostsAndComments();
//   const users = await seedDummyUsers();
//   const posts = await seedDummyPosts(users);
//   await seedDummyComments(users, posts);
  console.log("✅ Deleted all posts and comments; seeded dummy users successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error seeding data:", err);
  process.exit(1);
});
