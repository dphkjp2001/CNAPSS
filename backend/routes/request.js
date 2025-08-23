// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Request = require("../models/Request");
const MarketItem = require("../models/MarketItem");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const norm = (v) => String(v || "").trim().toLowerCase();

router.post("/", async (req, res) => {
  try {
    let { itemId, buyer, message } = req.body;
    if (!itemId || !buyer || !message) {
      // 필수 값 누락
      return res.status(400).json({ message: "Missing required fields." });
    }

    const objectId = new mongoose.Types.ObjectId(itemId);
    const buyerEmail = norm(buyer);

    // 1) 아이템 + 학교 확인
    const item = await MarketItem.findById(objectId).lean();
    if (!item) return res.status(404).json({ message: "Item not found." });
    const sellerEmail = norm(item.seller);
    const school = norm(item.school);
    if (!sellerEmail || !school) {
      return res.status(400).json({ message: "Seller or school info not found." });
    }

    // 2) 중복 요청 방지
    const exists = await Request.findOne({ itemId: objectId, buyer: buyerEmail });
    if (exists) return res.status(409).json({ message: "Request already sent." });

    await Request.create({ itemId: objectId, buyer: buyerEmail, message });

    // 3) 대화방 조회/생성 (학교 포함)
    let conversation = await Conversation.findOne({
      itemId: objectId,
      buyer: buyerEmail,
      seller: sellerEmail,
      school,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        itemId: objectId,
        buyer: buyerEmail,
        seller: sellerEmail,
        school,
        lastMessage: message,
      });
    }

    // 4) 메시지 저장 (학교 필수)
    await Message.create({
      conversationId: conversation._id,
      sender: buyerEmail,
      content: message,
      school,
    });

    // 5) 대화방 최신화
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    await conversation.save();

    return res.status(201).json({
      message: "Request and chat created successfully.",
      conversationId: conversation._id,
    });
  } catch (err) {
    console.error("❌ Request handling failed:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/:itemId/:buyer", async (req, res) => {
  try {
    const objectId = new mongoose.Types.ObjectId(req.params.itemId);
    const buyerEmail = norm(req.params.buyer);

    // 이미 요청했는지 여부 확인
    const exists = await Request.findOne({ itemId: objectId, buyer: buyerEmail });
    res.json({ alreadySent: !!exists });
  } catch (err) {
    console.error("❌ Lookup failed:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;


