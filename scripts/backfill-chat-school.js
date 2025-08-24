// scripts/backfill-chat-school.js
// Run: node scripts/backfill-chat-school.js
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../backend/models/User");
const Conversation = require("../backend/models/Conversation");
const Message = require("../backend/models/Message");

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { });
    console.log("✅ Connected");

    // 1) Conversations without school
    const convCur = Conversation.find({ $or: [{ school: { $exists: false } }, { school: null }] }).cursor();
    let convPatched = 0;

    for (let c = await convCur.next(); c; c = await convCur.next()) {
      const [buyerU, sellerU] = await Promise.all([
        User.findOne({ email: c.buyer }).select("school"),
        User.findOne({ email: c.seller }).select("school"),
      ]);

      if (buyerU?.school && sellerU?.school && buyerU.school === sellerU.school) {
        c.school = buyerU.school;
        await c.save();
        convPatched++;
      }
    }
    console.log(`🧩 Conversations patched: ${convPatched}`);

    // 2) Messages without school → inherit from its conversation
    const msgCur = Message.find({ $or: [{ school: { $exists: false } }, { school: null }] }).cursor();
    let msgPatched = 0;

    for (let m = await msgCur.next(); m; m = await msgCur.next()) {
      if (!m.conversationId) continue;
      const c = await Conversation.findById(m.conversationId).select("school");
      if (c?.school) {
        m.school = c.school;
        await m.save();
        msgPatched++;
      }
    }
    console.log(`🧩 Messages patched: ${msgPatched}`);

    await mongoose.disconnect();
    console.log("✨ Done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  }
})();
