// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const MarketItem = require("../models/MarketItem"); // to read item's school

const ALLOWED = ["nyu", "columbia", "boston"];
const norm = (v) => String(v || "").trim().toLowerCase();

// ─────────────────────────────────────────────────────────────
// Helpers
function pickSchool(req) {
  // prefer explicit school; fallback to body/query/header
  return norm(req.query.school || req.body?.school || req.headers["x-school"]);
}
// ─────────────────────────────────────────────────────────────

// ✅ 메시지 목록 (학교 가드 포함)
router.get("/:conversationId/messages", async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.conversationId).lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found." });

    // if client passed school, guard it
    const reqSchool = pickSchool(req);
    if (reqSchool && reqSchool !== convo.school) {
      return res.status(403).json({ message: "School mismatch." });
    }

    const messages = await Message.find({
      conversationId: convo._id,
      school: convo.school,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("❌ list messages failed:", err);
    res.status(500).json({ message: "Failed to load messages." });
  }
});

// ✅ 대화방 생성/조회 (아이템의 school로 스코프 고정)
router.post("/conversation", async (req, res) => {
  try {
    let { itemId, buyer, seller } = req.body || {};
    if (!itemId || !buyer || !seller) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const objectItemId = new mongoose.Types.ObjectId(itemId);
    const buyerEmail = norm(buyer);
    const sellerEmail = norm(seller);

    // read school's scope from the item
    const item = await MarketItem.findById(objectItemId).lean();
    if (!item || !item.school) {
      return res.status(400).json({ message: "Invalid item or school not set on item." });
    }
    const school = norm(item.school);
    if (!ALLOWED.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    // both users must belong to SAME school
    const [bu, su] = await Promise.all([
      User.findOne({ email: buyerEmail }).lean(),
      User.findOne({ email: sellerEmail }).lean(),
    ]);
    if (!bu || !su) return res.status(400).json({ message: "User not found." });
    if (norm(bu.school) !== school || norm(su.school) !== school) {
      return res.status(403).json({ message: "Users must be in the same school." });
    }

    let convo = await Conversation.findOne({
      itemId: objectItemId,
      buyer: buyerEmail,
      seller: sellerEmail,
      school,
    });

    if (!convo) {
      convo = await Conversation.create({
        itemId: objectItemId,
        buyer: buyerEmail,
        seller: sellerEmail,
        school,
      });
      return res.status(201).json({ conversationId: convo._id, created: true });
    }
    return res.status(200).json({ conversationId: convo._id, created: false });
  } catch (err) {
    console.error("❌ create conversation failed:", err);
    res.status(500).json({ message: "Failed to create conversation." });
  }
});

// ✅ 대화방 목록 (이메일+학교로 필터)
router.get("/conversations/:email", async (req, res) => {
  try {
    const email = norm(req.params.email);
    const school = pickSchool(req);
    if (!email || !school) {
      return res.status(400).json({ message: "Email and school are required." });
    }
    if (!ALLOWED.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const conversations = await Conversation.find({
      school,
      $or: [{ buyer: email }, { seller: email }],
    })
      .sort({ updatedAt: -1 })
      .populate("itemId")
      .lean();

    // attach peer nicknames
    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const buyerUser = await User.findOne({ email: c.buyer }).lean();
        const sellerUser = await User.findOne({ email: c.seller }).lean();
        return {
          ...c,
          buyerNickname: buyerUser?.nickname || "Unknown",
          sellerNickname: sellerUser?.nickname || "Unknown",
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("❌ list conversations failed:", err);
    res.status(500).json({ message: "Failed to load conversations." });
  }
});

module.exports = router;



