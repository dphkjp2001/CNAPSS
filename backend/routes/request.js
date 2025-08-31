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
 * helper: 공통 리소스 로딩
 */
async function loadTarget({ school, source, targetId, itemId }) {
  let sellerEmail = "";
  let resourceTitle = "";
  let resId = null;

  if (source === "market") {
    const id = targetId || itemId;
    if (!isValidId(id)) return { error: "Invalid itemId." };
    const item = await MarketItem.findOne({ _id: id, school }).lean();
    if (!item) return { error: "Item not found." };
    sellerEmail = norm(item.seller);
    resourceTitle = item.title || "";
    resId = new mongoose.Types.ObjectId(id);
    return { sellerEmail, resourceTitle, resId };
  }

  if (source === "coursehub") {
    if (!isValidId(targetId)) return { error: "Invalid materialId." };
    const mat = await Material.findOne({ _id: targetId, school }).lean();
    if (!mat) return { error: "Material not found." };
    sellerEmail = norm(mat.uploaderEmail || mat.authorEmail || "");
    if (!sellerEmail) return { error: "Material owner email missing." };
    resourceTitle = mat.courseTitle ? mat.courseTitle : mat.courseCode || "";
    resId = new mongoose.Types.ObjectId(targetId);
    return { sellerEmail, resourceTitle, resId };
  }

  return { error: "Invalid type." };
}

/**
 * POST /api/:school/request
 * body (market):     { type: "market",    targetId|itemId, message }
 * body (coursehub):  { type: "coursehub", targetId,        message }
 */
router.post("/", async (req, res) => {
  try {
    const school = norm(req.params.school);
    const buyerEmail = norm(req.user?.email);
    let { type, targetId, itemId, message } = req.body || {};
    type = norm(type);

    if (!school || !buyerEmail || !message) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    if (!type && itemId) type = "market"; // 레거시 호환

    // 1) 타겟 로드
    const loaded = await loadTarget({ school, source: type, targetId, itemId });
    if (loaded.error) return res.status(loaded.error === "Invalid itemId." || loaded.error === "Invalid materialId." || loaded.error === "Invalid type." ? 400 : 404).json({ message: loaded.error });

    const { sellerEmail, resourceTitle, resId } = loaded;
    if (buyerEmail === sellerEmail) return res.status(400).json({ message: "Cannot send request to yourself." });

    // 2) 중복 요청 검사
    const dupFilter = type === "market"
      ? { school, source: "market", itemId: resId, buyer: buyerEmail }
      : { school, source: "coursehub", materialId: resId, buyer: buyerEmail };

    const exists = await Request.findOne(dupFilter);
    if (exists) {
      // 이미 대화방도 있을 가능성 높음 → 찾아서 409과 함께 넘겨줌
      const convo =
        (await Conversation.findOne({ school, source: type, resourceId: resId, buyer: buyerEmail, seller: sellerEmail })) ||
        (type === "market"
          ? await Conversation.findOne({ school, source: "market", itemId: resId, buyer: buyerEmail, seller: sellerEmail })
          : null);

      return res.status(409).json({
        message: "Request already sent.",
        alreadySent: true,
        conversationId: convo?._id || null,
      });
    }

    // 3) Request 저장
    const requestDoc = await Request.create({
      school,
      source: type,
      itemId: type === "market" ? resId : null,
      materialId: type === "coursehub" ? resId : null,
      buyer: buyerEmail,
      seller: sellerEmail,
      message,
    });

    // 4) 대화방 조회/생성(리소스 단위 1개)
    const convoFilter = {
      school,
      buyer: buyerEmail,
      seller: sellerEmail,
      source: type,
      resourceId: resId,
    };

    let conversation = await Conversation.findOne(convoFilter);
    if (!conversation) {
      conversation = await Conversation.create({
        ...convoFilter,
        itemId: type === "market" ? resId : null, // 레거시 호환
        resourceTitle,
        lastMessage: message,
      });
    }

    // 5) 메시지 저장 + 최신화
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
 * GET /api/:school/request/status?type=coursehub&targetId=...   (또는 type=market&itemId=...)
 *  - 현재 로그인 사용자가 이미 요청을 보냈는지 여부 + 연결된 대화방 id 리턴
 *  - { alreadySent: boolean, conversationId?: string }
 */
router.get("/status", async (req, res) => {
  try {
    const school = norm(req.params.school);
    const buyerEmail = norm(req.user?.email);
    let { type, targetId, itemId } = req.query;
    type = norm(type);

    if (!school || !buyerEmail || !type) {
      return res.status(400).json({ message: "Missing params." });
    }
    if (!type && itemId) type = "market";

    const loaded = await loadTarget({ school, source: type, targetId, itemId });
    if (loaded.error) return res.status(loaded.error === "Invalid itemId." || loaded.error === "Invalid materialId." || loaded.error === "Invalid type." ? 400 : 404).json({ message: loaded.error });

    const { sellerEmail, resId } = loaded;

    const dupFilter = type === "market"
      ? { school, source: "market", itemId: resId, buyer: buyerEmail }
      : { school, source: "coursehub", materialId: resId, buyer: buyerEmail };

    const exists = await Request.findOne(dupFilter);

    const convo =
      (await Conversation.findOne({ school, source: type, resourceId: resId, buyer: buyerEmail, seller: sellerEmail })) ||
      (type === "market"
        ? await Conversation.findOne({ school, source: "market", itemId: resId, buyer: buyerEmail, seller: sellerEmail })
        : null);

    return res.json({
      alreadySent: !!exists,
      conversationId: convo?._id || null,
    });
  } catch (err) {
    console.error("❌ Status lookup failed:", err);
    res.status(500).json({ message: "Server error." });
  }
});

/**
 * (레거시) GET /api/:school/request/:itemId/:buyer?
 * - 기존 마켓 전용 체크 엔드포인트 그대로 유지
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





