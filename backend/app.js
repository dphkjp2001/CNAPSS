//backend/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// ✅ 라우터 import
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const notificationRoute = require("./routes/notification"); // 단수형!
const marketRoutes = require("./routes/market");
const chatRoutes = require("./routes/chat");
const requestRoutes = require("./routes/request");
const courseRoutes = require("./routes/course");
const scheduleRoutes = require("./routes/schedule");

// Foodplace
const placesRouter = require("./routes/places");



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
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notification", notificationRoute);
app.use("/api/market", marketRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/places", placesRouter); // 여기?

// ✅ 헬스체크
app.get("/", (req, res) => {
  res.send("✅ API 서버 정상 작동 중!");
});

module.exports = app;

