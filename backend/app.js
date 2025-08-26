//backend/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// ✅ 라우터 import
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const notificationRoute = require("./routes/notification");
const marketRoutes = require("./routes/market");
const chatRoutes = require("./routes/chat");
const requestRoutes = require("./routes/request");
const courseRoutes = require("./routes/course");
const scheduleRoutes = require("./routes/schedule");
const placesRouter = require("./routes/places");
const requireAuth = require("./middleware/requireAuth");
const schoolGuard = require("./middleware/schoolGuard");

// ✅ NEW: public posts router
const publicPostsRouter = require("./routes/public.posts");

// ✅ 환경변수 설정
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"
});

const app = express();

// ✅ 허용할 origin 리스트
const allowedOrigins = [
  "https://www.cnapss.com",
  "https://cnapss.com",
  "https://api.cnapss.com",
  "https://cnapss-3da82.web.app",
  "http://localhost:3000",
];

// ✅ CORS 설정
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ 차단된 origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ JSON 파싱
app.use(express.json());

// ✅ 라우트 등록
app.use("/api/auth", authRoutes);

// 🟢 NEW: 공개(읽기 전용) posts 목록
app.use("/api/public/:school/posts", publicPostsRouter);

// 🔁 멀티테넌시 적용된 posts (보호 라우트)
app.use("/api/:school/posts", postsRoutes);

// ⬇️ 나머지는 이후 단계에서 차례로 :school 적용 예정
app.use("/api/:school/comments", commentRoutes);
app.use("/api/:school/market", marketRoutes);
app.use("/api/:school/chat", chatRoutes);
app.use("/api/:school/notification", requireAuth, schoolGuard, notificationRoute);
app.use("/api/:school/request", requireAuth, schoolGuard, requestRoutes);

app.use("/api/course", courseRoutes);
app.use("/api/schedule", scheduleRoutes);


// places는 여전히 보호 (토큰+가드)
app.use("/api/:school/places", requireAuth, schoolGuard, placesRouter);

// ✅ 헬스체크
app.get("/", (req, res) => {
  res.send("✅ API 서버 정상 작동 중!");
});

module.exports = app;


