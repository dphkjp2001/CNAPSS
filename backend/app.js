// backend/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Routers
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

// Public routers
const publicPostsRouter = require("./routes/public.posts");
const publicMaterialsRouter = require("./routes/public.materials");
const publicMarketRouter = require("./routes/public.market");
const publicCommentsRouter = require("./routes/public.comments");

// ✅ Academic board (career 대체)
const academicPostsRoutes = require("./routes/academic.posts");
const publicAcademicPostsRouter = require("./routes/public.academic.posts");

// (Optional) reviews etc.
const reviewsRoutes = require("./routes/reviews");

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

const app = express();
app.set("trust proxy", 1);

// CORS
const allowedOrigins = [
  "https://www.cnapss.com",
  "https://cnapss.com",
  "https://api.cnapss.com",
  "https://cnapss-3da82.web.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      console.log("❌ Blocked Origin:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ----------------------- Auth ----------------------- */
app.use("/api/auth", authRoutes);

/* ----------------------- Public (no auth) ----------------------- */
app.use("/api/public/:school/posts", publicPostsRouter);
app.use("/api/public/:school/materials", publicMaterialsRouter);
app.use("/api/public/:school/market", publicMarketRouter);
app.use("/api/public/:school/comments", publicCommentsRouter);
// ✅ Academic (public)
app.use("/api/public/:school/academic-posts", publicAcademicPostsRouter);

/* ----------------------- Protected (school scoped) ----------------------- */
app.use("/api/:school/posts", postsRoutes);
app.use("/api/:school/comments", commentRoutes);
app.use("/api/:school/market", marketRoutes);
app.use("/api/:school/chat", chatRoutes);
app.use("/api/:school/notification", requireAuth, schoolGuard, notificationRoute);
app.use("/api/:school/request", requireAuth, schoolGuard, requestRoutes);
app.use("/api/:school/schedule", requireAuth, schoolGuard, scheduleRoutes);
app.use("/api/:school/courses", requireAuth, schoolGuard, courseHubRoutes);
app.use("/api/:school/materials", requireAuth, schoolGuard, materialsRoutes);
// ✅ Academic (protected)
app.use("/api", academicPostsRoutes);

// (Optional)
app.use("/api/:school/reviews", requireAuth, schoolGuard, reviewsRoutes);

// Voting routes
app.use("/api/:school/votes", require("./routes/votes.routes"));

// (예: places 프록시가 school 스코프가 아니라면 별도 경로로 마운트)
app.use("/api/places", placesRouter);

module.exports = app;









