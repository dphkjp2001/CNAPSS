// backend/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// 라우터
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const notificationRoute = require("./routes/notification");
const marketRoutes = require("./routes/market");
const chatRoutes = require("./routes/chat");
const requestRoutes = require("./routes/request");
const scheduleRoutes = require("./routes/schedule");
const placesRouter = require("./routes/places");
const requireAuth = require("./middleware/requireAuth");
const schoolGuard = require("./middleware/schoolGuard");
const courseHubRoutes = require("./routes/courses");
const materialsRoutes = require("./routes/materials");
const publicPostsRouter = require("./routes/public.posts");
const publicMaterialsRouter = require("./routes/public.materials"); 
const publicMarketRouter = require("./routes/public.market");
// ✅ NEW: Career Board
const careerPostsRoutes = require("./routes/career.posts");
const publicCareerPostsRouter = require("./routes/public.career.posts");

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

const app = express();

// 프록시 뒤에서 IP/프로토콜 판단 오류 방지
app.set("trust proxy", 1);

// 허용 origin
const allowedOrigins = [
  "https://www.cnapss.com",
  "https://cnapss.com",
  "https://api.cnapss.com",
  "https://cnapss-3da82.web.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    console.log("❌ Blocked Origin:", origin);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// 라우트
app.use("/api/auth", authRoutes);

// ✅ 공개 라우트(로그인 불필요)
app.use("/api/public/:school/posts", publicPostsRouter);
app.use("/api/public/:school/materials", publicMaterialsRouter);
app.use("/api/public/:school/market", publicMarketRouter);
// ✅ NEW: Career Board public
app.use("/api/public/:school/career-posts", publicCareerPostsRouter);

// ✅ 보호 라우트(학교 스코프)
app.use("/api/:school/posts", postsRoutes);
// ✅ NEW: Career Board protected
app.use("/api/:school/career-posts", careerPostsRoutes);

app.use("/api/:school/comments", commentRoutes);
app.use("/api/:school/market", marketRoutes);
app.use("/api/:school/chat", chatRoutes);
app.use("/api/:school/notification", requireAuth, schoolGuard, notificationRoute);
app.use("/api/:school/request", requireAuth, schoolGuard, requestRoutes);
app.use("/api/:school/schedule", requireAuth, schoolGuard, scheduleRoutes);
app.use("/api/:school/courses", requireAuth, schoolGuard, courseHubRoutes);
app.use("/api/:school/materials", requireAuth, schoolGuard, materialsRoutes);

module.exports = app;






