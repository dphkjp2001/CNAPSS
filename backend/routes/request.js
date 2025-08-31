// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router({ mergeParams: true });

const Request = require("../models/Request");
const MarketItem = require("../models/MarketItem");
const Material = require("../models/Material");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const norm = (v) => String(v || "").trim().toLowerCase();

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

/**
 * POST /api/:school/request
 * body (market):   { type: "market",  targetId, message }
 * body (coursehub):{ type: "coursehub", targetId, message }
 *  - buyer email은 req.user.email
 *  - target.school 과 URL의 :school 일치
 *  - 기존 마켓 플로우는 itemId로도 계속 동작 (호환)
 */
router.post("/", async (req, res) => {
  try {
    const school = norm(req.params.school);
    const buyerEmail = norm(req.user?.email);
    const { type, targetId, itemId, message } = req.body || {};

    if (!school || !buyerEmail || !message) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ─────────────────────────────────────────
    // 1) 타겟 판별
    let source = (type || "").trim().toLowerCase();
    let targetObject = null;
    let sellerEmail = "";
    let resourceTitle = "";
    let resId = null;

    if (!source) {
      // 레거시: itemId가 오면 market으로 간주
      if (itemId) source = "market";
    }

    if (source === "market") {
      const id = targetId || itemId;
      if (!isValidId(id)) return res.status(400).json({ message: "Invalid itemId." });
      targetObject = await MarketItem.findOne({ _id: id, school }).lean();
      if (!targetObject) return res.status(404).json({ message: "Item not found." });
      sellerEmail = norm(targetObject.seller);
      resourceTitle = targetObject.title || "";
      resId = new mongoose.Types.ObjectId(id);
    } else if (source === "coursehub") {
      if (!isValidId(targetId)) return res.status(400).json({ message: "Invalid materialId." });
      targetObject = await Material.findOne({ _id: targetId, school }).lean();
      if (!targetObject) return res.status(404).json({ message: "Material not found." });
      // uploaderEmail 이 소유자 이메일
      sellerEmail = norm(targetObject.uploaderEmail || targetObject.authorEmail || "");
      if (!sellerEmail) return res.status(400).json({ message: "Material owner email missing." });
      // 리스트 표시용 스냅샷
      resourceTitle = targetObject.courseTitle
        ? targetObject.courseTitle
        : targetObject.courseCode || "";
      resId = new mongoose.Types.ObjectId(targetId);
    } else {
      return res.status(400).json({ message: "Invalid type." });
    }

    if (buyerEmail === sellerEmail) {
      return res.status(400).json({ message: "Cannot send request to yourself." });
    }

    // ─────────────────────────────────────────
    // 2) 중복 요청 방지
    const dupFilter =
      source === "market"
        ? { school, source, itemId: resId, buyer: buyerEmail }
        : { school, source, materialId: resId, buyer: buyerEmail };

    const exists = await Request.findOne(dupFilter);
    if (exists) return res.status(409).json({ message: "Request already sent." });

    // 저장
    const requestDoc = await Request.create({
      school,
      source,
      itemId: source === "market" ? resId : null,
      materialId: source === "coursehub" ? resId : null,
      buyer: buyerEmail,
      seller: sellerEmail,
      message,
    });

    // ─────────────────────────────────────────
    // 3) 대화방 조회/생성 (아이템 단위로 고유)
    const convoFilter = {
      school,
      buyer: buyerEmail,
      seller: sellerEmail,
      source,
      resourceId: resId,
    };

    let conversation = await Conversation.findOne(convoFilter);
    if (!conversation) {
      conversation = await Conversation.create({
        ...convoFilter,
        itemId: source === "market" ? resId : null, // 레거시 호환
        resourceTitle,
        lastMessage: message,
      });
    }

    // ─────────────────────────────────────────
    // 4) 메시지 저장 + 최신화
    await Message.create({
      conversationId: conversation._id,
      sender: buyerEmail,
      content: message,
      school,
    });

    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    await conversation.save();

    return res.status(201).json({
      ok: true,
      conversationId: conversation._id,
      requestId: requestDoc._id,
    });
  } catch (err) {
    console.error("❌ Request handling failed:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET /api/:school/request/:itemId/:buyer?
 * - 레거시(마켓) 호환용: 현재는 market만 체크
 */
router.get("/:itemId/:buyer?", async (req, res) => {
  try {
    const school = norm(req.params.school);
    const buyerEmail = norm(req.user?.email);
    const objectId = new mongoose.Types.ObjectId(req.params.itemId);

    const exists = await Request.findOne({ school, source: "market", itemId: objectId, buyer: buyerEmail });
    res.json({ alreadySent: !!exists });
  } catch (err) {
    console.error("❌ Lookup failed:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;




