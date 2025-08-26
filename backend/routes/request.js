// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router({ mergeParams: true });

const Request = require("../models/Request");
const MarketItem = require("../models/MarketItem");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const norm = (v) => String(v || "").trim().toLowerCase();

/**
 * POST /api/:school/request
 * body: { itemId, message }
 * - buyer email은 req.user.email에서 가져온다(신뢰 가능한 소스)
 * - item.school과 req.params.school이 일치해야 한다
 */
router.post("/", async (req, res) => {
  try {
    const school = norm(req.params.school);
    const buyerEmail = norm(req.user?.email);
    const { itemId, message } = req.body || {};

    if (!school || !buyerEmail || !itemId || !message) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const objectId = new mongoose.Types.ObjectId(itemId);

    // 1) 아이템 + 학교 확인
    const item = await MarketItem.findOne({ _id: objectId, school }).lean();
    if (!item) return res.status(404).json({ message: "Item not found." });

    const sellerEmail = norm(item.seller);

    // 2) 중복 요청 방지(학교 단위)
    const exists = await Request.findOne({ school, itemId: objectId, buyer: buyerEmail });
    if (exists) return res.status(409).json({ message: "Request already sent." });

    await Request.create({ school, itemId: objectId, buyer: buyerEmail, message });

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

    // 4) 메시지 저장 (학교 포함)
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

/**
 * GET /api/:school/request/:itemId/:buyer(ignored)
 * - 프런트 호환을 위해 경로는 유지하되, 실제 buyer는 req.user.email을 사용
 */
router.get("/:itemId/:buyer?", async (req, res) => {
  try {
    const school = norm(req.params.school);
    const buyerEmail = norm(req.user?.email);
    const objectId = new mongoose.Types.ObjectId(req.params.itemId);

    const exists = await Request.findOne({ school, itemId: objectId, buyer: buyerEmail });
    res.json({ alreadySent: !!exists });
  } catch (err) {
    console.error("❌ Lookup failed:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;



