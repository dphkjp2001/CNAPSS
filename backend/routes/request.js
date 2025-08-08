// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Request = require("../models/Request");
const MarketItem = require("../models/MarketItem");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

router.post("/", async (req, res) => {
  const { itemId, buyer, message } = req.body;

  if (!itemId || !buyer || !message) {
    return res.status(400).json({ message: "필수 정보 누락" });
  }

  try {
    const objectId = new mongoose.Types.ObjectId(itemId);

    const exists = await Request.findOne({ itemId: objectId, buyer });
    if (exists) {
      return res.status(409).json({ message: "이미 요청 보냄" });
    }

    // ✅ Request 저장
    const newRequest = new Request({ itemId: objectId, buyer, message });
    await newRequest.save();

    // ✅ 판매자 확인
    const item = await MarketItem.findById(objectId);
    const seller = item?.seller;
    if (!seller) {
      return res.status(404).json({ message: "판매자 정보 없음" });
    }

    // ✅ Conversation 조회 또는 생성
    let conversation = await Conversation.findOne({
      itemId: objectId,
      buyer,
      seller,
    });

    if (!conversation) {
      conversation = new Conversation({
        itemId: objectId,
        buyer,
        seller,
      });
      await conversation.save();
    }

    // ✅ 메시지 저장
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: buyer,
      content: message,
    });
    await newMessage.save();

    // ✅ 대화방 최신 메시지 업데이트
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    await conversation.save();

    res.status(201).json({
      message: "요청 및 채팅 생성 완료",
      conversationId: conversation._id,
    });
  } catch (err) {
    console.error("❌ 요청 처리 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/:itemId/:buyer", async (req, res) => {
  const { itemId, buyer } = req.params;

  try {
    const objectId = new mongoose.Types.ObjectId(itemId);
    const exists = await Request.findOne({ itemId: objectId, buyer });
    res.json({ alreadySent: !!exists });
  } catch (err) {
    console.error("❌ 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
