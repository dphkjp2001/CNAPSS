// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const mongoose = require("mongoose");


// ✅ 메시지 목록 조회
router.get("/:conversationId/messages", async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("❌ 메시지 조회 실패:", err);
    res.status(500).json({ message: "Failed to load messages." });
  }
});

// ✅ 대화방 생성 또는 조회
router.post("/conversation", async (req, res) => {
  let { itemId, buyer, seller } = req.body;

  if (!itemId || !buyer || !seller) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const objectItemId = new mongoose.Types.ObjectId(itemId);
    let convo = await Conversation.findOne({ itemId: objectItemId, buyer, seller });

    if (!convo) {
      convo = new Conversation({ itemId: objectItemId, buyer, seller });
      await convo.save();
      return res.status(201).json({ conversationId: convo._id, created: true });
    } else {
      return res.status(200).json({ conversationId: convo._id, created: false });
    }
  } catch (err) {
    console.error("❌ 대화방 생성 실패:", err);
    res.status(500).json({ message: "Failed to create conversation." });
  }
});

// ✅ 📌 [수정 대상] 대화방 목록 + 상대방 닉네임 포함
router.get("/conversations/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const conversations = await Conversation.find({
      $or: [{ buyer: email }, { seller: email }],
    })
      .sort({ updatedAt: -1 })
      .populate("itemId");

    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const buyerUser = await User.findOne({ email: c.buyer }).lean();
        const sellerUser = await User.findOne({ email: c.seller }).lean();

        return {
          ...c.toObject(),
          buyerNickname: buyerUser?.nickname || "Unknown",
          sellerNickname: sellerUser?.nickname || "Unknown",
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("❌ 대화 목록 불러오기 실패:", err);
    res.status(500).json({ message: "대화 목록 불러오기 실패" });
  }
});

module.exports = router;


