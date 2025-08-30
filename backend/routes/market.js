// backend/routes/market.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router({ mergeParams: true });

const MarketItem = require("../models/MarketItem");
const User = require("../models/User");
const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");
const { deleteFromCloudinary } = require("../utils/deleteFromCloudinary");

// 🔒 모든 market 라우트 보호 + 테넌트 일치 강제
router.use(requireAuth, schoolGuard);

// utils
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /
 * - 내 학교 마켓 아이템 목록
 * - optional 쿼리: q(검색), status, minPrice, maxPrice, sort(latest|price_asc|price_desc)
 */
router.get("/", async (req, res) => {
  try {
    const { q = "", status, minPrice, maxPrice, sort = "latest" } = req.query;

    const filter = { school: req.user.school };
    if (status && ["available", "reserved", "sold"].includes(status)) {
      filter.status = status;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }

    let sortSpec = { createdAt: -1 };
    if (sort === "price_asc") sortSpec = { price: 1, createdAt: -1 };
    if (sort === "price_desc") sortSpec = { price: -1, createdAt: -1 };

    const items = await MarketItem.find(filter).sort(sortSpec);
    res.json(items);
  } catch (err) {
    console.error("List market error:", err);
    res.status(500).json({ message: "Failed to fetch items." });
  }
});

/**
 * GET /mine
 * - 내가 올린 아이템 목록
 */
router.get("/mine", async (req, res) => {
  try {
    const items = await MarketItem.find({
      seller: req.user.email,
      school: req.user.school,
    }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Mine list error:", err);
    res.status(500).json({ message: "Failed to fetch my items." });
  }
});

/**
 * GET /request/:itemId/:buyerEmail
 * - 문의 보냈는지 여부 (본인만 확인 가능, superadmin 예외)
 * - ✅ school 스코프 반영
 */
router.get("/request/:itemId/:buyerEmail", async (req, res) => {
  const { itemId, buyerEmail } = req.params;
  if (!isValidId(itemId)) {
    return res.status(400).json({ message: "Invalid item id" });
  }
  if (req.user.role !== "superadmin" && buyerEmail.toLowerCase().trim() !== req.user.email) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const item = await MarketItem.findOne({ _id: itemId, school: req.user.school });
    if (!item) return res.status(404).json({ message: "Item not found." });

    const exists = await Request.findOne({
      school: req.user.school,
      itemId,
      buyer: buyerEmail.toLowerCase().trim(),
    });
    res.json({ alreadySent: !!exists });
  } catch (err) {
    console.error("Check request exists error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /request
 * - 문의 요청 + 대화/메시지 생성
 * body: { itemId, message }
 * - buyer는 토큰에서 읽음(클라 입력 무시)
 * - ✅ Request 생성/조회에 school 주입(스키마에서 required) 
 */
router.post("/request", async (req, res) => {
  const { itemId, message } = req.body;
  if (!isValidId(itemId) || !message) {
    return res.status(400).json({ message: "itemId and message are required." });
  }

  try {
    // 1) 내 학교 아이템인지 확인
    const item = await MarketItem.findOne({ _id: itemId, school: req.user.school });
    if (!item) return res.status(404).json({ message: "Item not found." });

    const buyer = req.user.email;
    const seller = item.seller;
    const school = req.user.school;

    if (buyer === seller) {
      return res.status(400).json({ message: "You cannot inquire about your own item." });
    }

    // 2) 중복 요청 방지 (school 포함)
    const dup = await Request.findOne({ school, itemId, buyer });
    if (dup) {
      return res.status(409).json({ message: "Request already sent." });
    }

    // 3) Request 생성 (✅ school 필수)
    const newRequest = await Request.create({ school, itemId, buyer, message });

    // 4) 대화 찾기/생성 (school 기준)
    let conversation = await Conversation.findOne({ itemId, buyer, seller, school });

    // 과거에 school 없이 만들어진 문서 호환
    if (!conversation) {
      const old = await Conversation.findOne({ itemId, buyer, seller, school: { $exists: false } });
      if (old) {
        old.school = school;
        await old.save();
        conversation = old;
      }
    }

    if (!conversation) {
      conversation = await Conversation.create({ itemId, buyer, seller, school });
    }

    // 5) 메시지 저장 (school 주입)
    await Message.create({
      conversationId: conversation._id,
      sender: buyer,
      content: message,
      school,
    });

    // 6) 대화 미리보기 갱신
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    if (!conversation.school) conversation.school = school;
    await conversation.save();

    return res.status(201).json({
      message: "Inquiry sent.",
      conversationId: conversation._id,
      requestId: newRequest._id,
    });
  } catch (err) {
    console.error("Create request error:", err);
    return res.status(500).json({ message: "Failed to send request." });
  }
});

/**
 * GET /:id
 * - 단일 아이템 조회(같은 학교)
 * - sellerNickname 포함
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  try {
    const item = await MarketItem.findOne({ _id: id, school: req.user.school }).lean();
    if (!item) return res.status(404).json({ message: "Item not found." });

    const sellerUser = await User.findOne({ email: item.seller }).lean();
    const sellerNickname = sellerUser?.nickname || "Unknown";
    res.json({ ...item, sellerNickname });
  } catch (err) {
    console.error("Fetch item error:", err);
    res.status(500).json({ message: "Failed to fetch item." });
  }
});

/**
 * POST /
 * - 아이템 등록 (seller, school은 서버 주입)
 */
router.post("/", async (req, res) => {
  try {
    const { title, description = "", price, images = [] } = req.body;
    if (!title || price === undefined) {
      return res.status(400).json({ message: "title and price are required." });
    }

    const me = await User.findOne({ email: req.user.email });
    if (!me || !me.isVerified) {
      return res.status(403).json({ message: "Only verified users can create items." });
    }

    const item = await MarketItem.create({
      title: String(title).trim(),
      description,
      price: Number(price),
      images: Array.isArray(images) ? images : [],
      seller: req.user.email,
      school: req.user.school,
    });

    res.status(201).json(item);
  } catch (err) {
    console.error("Create item error:", err);
    res.status(400).json({ message: "Failed to create item." });
  }
});

/**
 * PUT /:id
 * - 아이템 수정
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  try {
    const item = await MarketItem.findOne({ _id: id, school: req.user.school });
    if (!item) return res.status(404).json({ message: "Item not found." });

    if (item.seller !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only edit your own items." });
    }

    const { title, description, price, images } = req.body;
    if (title !== undefined) item.title = String(title).trim();
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = Number(price);
    if (images !== undefined) item.images = Array.isArray(images) ? images : [];

    await item.save();
    res.json({ message: "Item updated successfully.", item });
  } catch (err) {
    console.error("Update item error:", err);
    res.status(500).json({ message: "Failed to update item." });
  }
});

/**
 * PATCH /:id/status
 * - 상태 변경 (available|reserved|sold)
 */
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid item id" });
  }
  if (!["available", "reserved", "sold"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    const item = await MarketItem.findOne({ _id: id, school: req.user.school });
    if (!item) return res.status(404).json({ message: "Item not found." });

    if (item.seller !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only update your own items." });
    }

    item.status = status;
    await item.save();
    res.json({ message: "Status updated.", status: item.status });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Failed to update status." });
  }
});

/**
 * DELETE /:id
 * - 아이템 삭제 + Cloudinary 정리
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  try {
    const item = await MarketItem.findOne({ _id: id, school: req.user.school });
    if (!item) return res.status(404).json({ message: "Item not found." });

    if (item.seller !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own items." });
    }

    if (Array.isArray(item.images) && item.images.length) {
      for (const imageUrl of item.images) {
        try {
          await deleteFromCloudinary(imageUrl);
        } catch (e) {
          console.warn("Cloudinary deletion skipped:", e?.message || e);
        }
      }
    }

    await item.deleteOne();
    res.json({ message: "Item deleted and images removed." });
  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ message: "Failed to delete item." });
  }
});

module.exports = router;


