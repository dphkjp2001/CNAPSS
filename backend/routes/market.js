// backend/routes/market.js
const express = require("express");
const router = express.Router();
const MarketItem = require("../models/MarketItem");
const User = require("../models/User");
const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { deleteFromCloudinary } = require("../utils/deleteFromCloudinary");

// ✅ 전체 목록
router.get("/", async (req, res) => {
  try {
    const filter = req.query.school ? { school: req.query.school } : {};
    const items = await MarketItem.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// ✅ 문의 여부 확인
router.get("/request/:itemId/:buyerEmail", async (req, res) => {
  const { itemId, buyerEmail } = req.params;

  try {
    const exists = await Request.findOne({ itemId, buyer: buyerEmail });
    res.json({ alreadySent: !!exists });
  } catch (err) {
    console.error("❌ 문의 여부 확인 실패:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ 문의 요청 + 채팅방/메시지 생성
// ✅ 이미 상단에 필요한 모델 불러온 상태 가정
router.post("/request", async (req, res) => {
  const { itemId, buyer, message } = req.body;

  if (!itemId || !buyer || !message) {
    return res.status(400).json({ message: "필수 정보가 누락되었습니다." });
  }

  try {
    const exists = await Request.findOne({ itemId, buyer });
    if (exists) {
      return res.status(409).json({ message: "이미 요청을 보냈습니다." });
    }

    // 1. Request 저장
    const newRequest = new Request({ itemId, buyer, message });
    await newRequest.save();

    // 2. 판매자 확인
    const item = await MarketItem.findById(itemId);
    if (!item) return res.status(404).json({ message: "판매 아이템을 찾을 수 없습니다." });
    const seller = item.seller;

    // 3. Conversation 확인/생성 (기존 participants → buyer/seller로 수정)
    let conversation = await Conversation.findOne({
      itemId,
      buyer,
      seller,
    });

    if (!conversation) {
      conversation = new Conversation({
        itemId,
        buyer,
        seller,
      });
      await conversation.save();
    }

    // 4. 메시지 저장
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: buyer,
      content: message,
    });
    await newMessage.save();

    // 5. 최신 메시지 업데이트
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    await conversation.save();

    res.status(201).json({
      message: "문의 전송 완료",
      conversationId: conversation._id,
    });

  } catch (err) {
    console.error("❌ 문의 저장 실패:", err);
    res.status(500).json({ message: "서버 오류로 문의 저장 실패" });
  }
});


// ✅ 단일 아이템 조회 + 닉네임 포함
router.get("/:id", async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Item not found" });

    const sellerUser = await User.findOne({ email: item.seller }).lean();
    const sellerNickname = sellerUser?.nickname || "Unknown";

    res.json({
      ...item,
      sellerNickname,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

// ✅ 아이템 등록
router.post("/", async (req, res) => {
  try {
    const { title, description, price, images, school, seller } = req.body;
    const item = new MarketItem({
      title,
      description,
      price,
      images,
      school,
      seller,
    });
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: "Failed to create item" });
  }
});

// ✅ 아이템 수정
router.put("/:id", async (req, res) => {
  try {
    const { title, description, price, images } = req.body;
    const item = await MarketItem.findByIdAndUpdate(
      req.params.id,
      { title, description, price, images },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

// ✅ 아이템 삭제
router.delete("/:id", async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    if (Array.isArray(item.images)) {
      for (const imageUrl of item.images) {
        await deleteFromCloudinary(imageUrl);
      }
    }

    await item.deleteOne();
    res.json({ message: "Item deleted and images removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item", detail: err.message });
  }
});

module.exports = router;
