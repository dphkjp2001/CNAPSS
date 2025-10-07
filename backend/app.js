// backend/app.js
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/posts.routes");
const commentRoutes = require("./routes/comments.routes");
const voteRoutes = require("./routes/votes.routes");
const requestRoutes = require("./routes/requests.routes");
const chatRoutes = require("./routes/chat.routes");
const notificationRoutes = require("./routes/notifications.routes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean) || true,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api", authRoutes);
app.use("/api", postRoutes);
app.use("/api", commentRoutes);
app.use("/api", voteRoutes);
app.use("/api", requestRoutes);
app.use("/api", chatRoutes);
app.use("/api", notificationRoutes);

module.exports = app;











