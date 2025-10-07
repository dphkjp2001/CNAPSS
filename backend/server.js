// backend/server.js
require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 10000;

async function bootstrap() {
  await connectDB(process.env.MONGODB_URI);
  const server = http.createServer(app);

  // (Phase 4에서 socket.io 붙일 예정)
  server.listen(PORT, () => {
    console.log(`🚀 API listening on :${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("❌ Boot error", err);
  process.exit(1);
});



