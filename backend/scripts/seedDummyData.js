// backend/scripts/seedDummyData.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "./.env" });

const User = require("../models/User");
const Post = require("../models/Post");
const AcademicPost = require("../models/AcademicPost");
const Comment = require("../models/Comment");

  const academicPairs = [
    {
      title: "Help with CS midterm topics?",
      bodies: [
        "Anyone else confused about the dynamic programming section? Slides make zero sense.",
        "What’s actually on the midterm — recursion, DP, or both?",
        "I’ve been grinding LeetCode all week and still feel unprepared 😭.",
      ],
    },
    {
      title: "Looking for Econ study group",
      bodies: [
        "Trying to form a small group before next week’s macro midterm.",
        "Anyone down to review problem sets together?",
        "Prefer people who actually show up lol — DM me if interested.",
      ],
    },
    {
      title: "Is Prof Bloomberg’s class curved?",
      bodies: [
        "He said grades are based on distribution, but how steep is the curve?",
        "Rumor says last semester’s average was a B-.",
        "Wondering if it’s even worth aiming for an A at this point 😅.",
      ],
    },
    {
      title: "Best way to learn React fast?",
      bodies: [
        "Need to build a project for SWE class — any YouTube recs?",
        "What helped you understand state and props quickly?",
        "Should I start with a tutorial or just dive in with Vite?",
      ],
    },
    {
      title: "Study partner for Game Theory?",
      bodies: [
        "Looking for someone to review concepts together before the midterm.",
        "Anyone free this weekend for a quick recap session?",
        "I’m mostly solid on math but weak on theory. could pair up!",
      ],
    },
    {
      title: "Where to find past exam papers?",
      bodies: [
        "Do professors ever share old tests or is it all rumor chain?",
        "Checked CourseWorks but found nothing — any ideas?",
        "Would love a dropbox link if someone has it 🙏.",
      ],
    },
    {
      title: "Advice for first coding internship?",
      bodies: [
        "Got a summer offer — what should I brush up on before starting?",
        "How much do people actually use algorithms at work?",
        "Any tips for working with senior devs without looking clueless?",
      ],
    },
    {
      title: "How to survive finals week?",
      bodies: [
        "Sleep is optional right? Asking for a friend.",
        "Balancing three papers and two exams — someone send coffee.",
        "Real talk: how do you avoid burnout during finals?",
      ],
    },
    {
      title: "Anyone used ChatGPT for essay brainstorming?",
      bodies: [
        "Does it actually help structure ideas, or just rephrase what I write?",
        "Curious if professors can detect AI-assisted drafts.",
        "Thinking of using it for outline help only — ethical gray area?",
      ],
    },
    {
      title: "Math 201 final — how hard is it?",
      bodies: [
        "Heard the curve last year was brutal.",
        "Should I focus more on proofs or calculations?",
        "Any tips for surviving the last chapter’s problems?",
      ],
    },
  ];
  const freeboardPairs = [
    {
      title: "Best study spots near campus?",
      bodies: [
        "Where do you go when Bobst is packed?",
        "Looking for places with outlets and natural light.",
        "Any off-campus cafés worth the walk?"
      ],
    },
    {
      title: "Anyone know good late-night eats?",
      bodies: [
        "After midnight my only option seems to be 7-Eleven 😭.",
        "What’s open after 1 AM around Washington Sq?",
        "Craving ramen or pizza—help!"
      ],
    },
    {
      title: "Tips for staying awake in 9 AM classes?",
      bodies: [
        "Coffee isn’t cutting it anymore.",
        "How do you morning people do it?",
        "Thinking about switching to night classes lol."
      ],
    },
    {
      title: "How to meet more people outside your major?",
      bodies: [
        "Feels like I only ever talk to CS kids.",
        "Any good clubs or orgs that are actually social?",
        "Need ideas to branch out a bit this semester."
      ],
    },
    {
      title: "Lost AirPods at Kimmel 😭",
      bodies: [
        "If anyone finds a single left AirPod near room 802, pls DM.",
        "Dropped my case in the lounge yesterday—checked lost & found already.",
        "Manifesting their return 🕯️."
      ],
    },
    {
      title: "Where do you guys get cheap textbooks?",
      bodies: [
        "Bookstore prices are criminal.",
        "Is Amazon still cheapest or any student swap groups?",
        "Open to used copies or PDF sites 👀."
      ],
    },
    {
      title: "Fun electives to take this semester?",
      bodies: [
        "Need 2 credits that won’t destroy my GPA.",
        "Looking for chill classes with good profs.",
        "Open to anything artsy or discussion-based."
      ],
    },
    {
      title: "Favorite NYU coffee spots?",
      bodies: [
        "Tried Think Coffee too many times—need new recs.",
        "Best place to study + caffeine combo?",
        "Blue Bottle or Bust?"
      ],
    },
    {
      title: "Group project horror stories?",
      bodies: [
        "My teammate ghosted a week before presentation 😩.",
        "Drop your worst experiences for solidarity.",
        "Should we normalize peer reviews counting for 80%?"
      ],
    },
    {
      title: "Any gym tips for beginners?",
      bodies: [
        "Trying to build consistency this semester.",
        "What’s the least intimidating time to go?",
        "Need beginner-friendly routines for Palladium."
      ],
    },
  ];

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

/* ========================== USERS =========================== */
async function seedDummyUsers() {
  const baseNames = [
    "Ashley", "Brad", "Carson", "David", "Ella",
    "Frank", "Grace", "Hannah", "Ian", "Jade",
    "Kyle", "Lily", "Mason", "Nora", "Oscar",
    "Penny", "Quinn", "Ryan", "Sophie", "Tyler"
  ];

  // Nickname patterns without any tech-style suffixes
  const nicknamePatterns = [
    (n) => n.toLowerCase(),
    (n) => n.toLowerCase() + Math.floor(10 + Math.random() * 90), // alice42
    (n) => n.toLowerCase().slice(0, 3) + "_" + n.toLowerCase().slice(-1), // ali_e
    (n) => n.toLowerCase() + ["_", ".", ""].sort(() => 0.5 - Math.random())[0] + n[0].toLowerCase(),
    (n) => n.toLowerCase() + ["_", ".", ""].sort(() => 0.5 - Math.random())[0] + Math.floor(Math.random() * 100),
  ];

  const users = [];
  const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

  for (let i = 0; i < baseNames.length; i++) {
    const name = baseNames[i];
    const nickname = random(nicknamePatterns)(name);

    users.push({
      email: `${name.toLowerCase()}@nyu.edu`,
      password: await bcrypt.hash("decacorn123", 10),
      nickname,
      school: "nyu",
      isVerified: true,
      classOf: 2025 + (i % 4),
    });
  }

  const result = await User.insertMany(users);
  console.log(`👥 Created ${result.length} NYU users with realistic nicknames`);
  return result;
}
/* ========================== POSTS & COMMENTS =========================== */

async function seedDummyPosts(users) {
  const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const allPairs = [...freeboardPairs, ...academicPairs];
  const posts = [];
  const academicSeekingPosts = [];

  for (let i = 0; i < 30; i++) {
    const author = random(users);
    const isAcademic = Math.random() > 0.5;
    const isSeeking = isAcademic && Math.random() < 0.25; // ~25% of academic posts go to AcademicPost
    const pair = isAcademic ? random(academicPairs) : random(freeboardPairs);
    const title = pair.title;
    const content = random(pair.bodies);

    const isAnonymous = Math.random() < 0.4;
    const createdAt = new Date(
      Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000
    );

    // ---- Regular posts (go to Post collection)
    if (!isSeeking) {
      posts.push({
        school: author.school,
        board: isAcademic ? "academic" : "free",
        mode: "general",
        title,
        content,
        author: author._id,
        anonymous: isAnonymous,
        nickname: isAnonymous ? "Anonymous" : author.nickname,
        counts: {
          up: Math.floor(Math.random() * 50),
          down: Math.floor(Math.random() * 5),
        },
        createdAt,
        updatedAt: createdAt,
      });
    } else {
      // ---- Academic "looking_for" type (go to AcademicPost collection)
      academicSeekingPosts.push({
        school: author.school,
        mode: "looking_for",
        kind: random(["study_mate", "course_materials", "coffee_chat"]),
        title,
        content,
        author: author._id,
        anonymous: isAnonymous,
        counts: {
          up: Math.floor(Math.random() * 30),
          down: Math.floor(Math.random() * 3),
        },
      });
    }
  }

  const postResults = await Post.insertMany(posts);
  console.log(`📝 Created ${postResults.length} posts in Post collection`);

  if (academicSeekingPosts.length > 0) {
    const academicResults = await AcademicPost.insertMany(academicSeekingPosts);
    console.log(
      `📘 Created ${academicResults.length} academic 'looking_for' posts in AcademicPost collection`
    );
  }

  return [...posts, ...academicSeekingPosts];
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
  // await clearExistingPostsAndComments();
  console.log("seeding users...");
  const users = await seedDummyUsers();
  // const posts = await seedDummyPosts(users);
  // await seedDummyComments(users, posts);
  // console.log("✅ Deleted all posts and comments; seeded dummy users, posts, comments successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error seeding data:", err);
  process.exit(1);
});
