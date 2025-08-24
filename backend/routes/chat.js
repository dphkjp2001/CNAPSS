// // backend/routes/chat.js
// const express = require("express");
// const router = express.Router();
// const mongoose = require("mongoose");

// const Conversation = require("../models/Conversation");
// const Message = require("../models/Message");
// const User = require("../models/User");
// const MarketItem = require("../models/MarketItem"); // to read item's school

// const ALLOWED = ["nyu", "columbia", "boston"];
// const norm = (v) => String(v || "").trim().toLowerCase();

// // ─────────────────────────────────────────────────────────────
// // Helpers
// function pickSchool(req) {
//   // prefer explicit school; fallback to body/query/header
//   return norm(req.query.school || req.body?.school || req.headers["x-school"]);
// }
// // ─────────────────────────────────────────────────────────────

// // ✅ 메시지 목록 (학교 가드 포함)
// router.get("/:conversationId/messages", async (req, res) => {
//   try {
//     const convo = await Conversation.findById(req.params.conversationId).lean();
//     if (!convo) return res.status(404).json({ message: "Conversation not found." });

//     // if client passed school, guard it
//     const reqSchool = pickSchool(req);
//     if (reqSchool && reqSchool !== convo.school) {
//       return res.status(403).json({ message: "School mismatch." });
//     }

//     const messages = await Message.find({
//       conversationId: convo._id,
//       school: convo.school,
//     }).sort({ createdAt: 1 });

//     res.json(messages);
//   } catch (err) {
//     console.error("❌ list messages failed:", err);
//     res.status(500).json({ message: "Failed to load messages." });
//   }
// });

// // ✅ 대화방 생성/조회 (아이템의 school로 스코프 고정)
// router.post("/conversation", async (req, res) => {
//   try {
//     let { itemId, buyer, seller } = req.body || {};
//     if (!itemId || !buyer || !seller) {
//       return res.status(400).json({ message: "Missing required fields." });
//     }

//     const objectItemId = new mongoose.Types.ObjectId(itemId);
//     const buyerEmail = norm(buyer);
//     const sellerEmail = norm(seller);

//     // read school's scope from the item
//     const item = await MarketItem.findById(objectItemId).lean();
//     if (!item || !item.school) {
//       return res.status(400).json({ message: "Invalid item or school not set on item." });
//     }
//     const school = norm(item.school);
//     if (!ALLOWED.includes(school)) {
//       return res.status(400).json({ message: "Invalid school." });
//     }

//     // both users must belong to SAME school
//     const [bu, su] = await Promise.all([
//       User.findOne({ email: buyerEmail }).lean(),
//       User.findOne({ email: sellerEmail }).lean(),
//     ]);
//     if (!bu || !su) return res.status(400).json({ message: "User not found." });
//     if (norm(bu.school) !== school || norm(su.school) !== school) {
//       return res.status(403).json({ message: "Users must be in the same school." });
//     }

//     let convo = await Conversation.findOne({
//       itemId: objectItemId,
//       buyer: buyerEmail,
//       seller: sellerEmail,
//       school,
//     });

//     if (!convo) {
//       convo = await Conversation.create({
//         itemId: objectItemId,
//         buyer: buyerEmail,
//         seller: sellerEmail,
//         school,
//       });
//       return res.status(201).json({ conversationId: convo._id, created: true });
//     }
//     return res.status(200).json({ conversationId: convo._id, created: false });
//   } catch (err) {
//     console.error("❌ create conversation failed:", err);
//     res.status(500).json({ message: "Failed to create conversation." });
//   }
// });


// // ✅ 대화방 목록 + 상대방 닉네임 포함 (email path-param은 URL-encoded 가정)
// // ✅ 대화방 목록 + 상대 닉네임 포함 (레거시 호환 + 이메일 정규화 + optional school)
// router.get("/conversations/:email", async (req, res) => {
//   try {
//     // 1) 이메일 방어: URL-decoding + trim + lowercase
//     const raw = req.params.email || "";
//     const email = decodeURIComponent(raw).trim().toLowerCase();
//     if (!email) return res.status(400).json({ message: "Email required." });

//     // 2) (선택) 학교 스코프: ?school=nyu 로 오면 함께 필터
//     const school = (req.query.school || "").trim().toLowerCase();

//     // 3) 레거시/신규 모두 잡는 쿼리
//     const query = {
//       $or: [
//         { buyer: email },
//         { seller: email },
//         { participants: email }, // 👈 과거 participants 배열 스키마 호환
//       ],
//     };
//     if (school) query.school = school; // 문서에 school이 없는 경우는 이 필터를 빼고 쓰세요.

//     const conversations = await Conversation.find(query)
//       .sort({ updatedAt: -1 })
//       .populate("itemId")
//       .lean();

//     // 4) 상대 닉네임 붙이기
//     const enriched = await Promise.all(
//       conversations.map(async (c) => {
//         const buyer = String(c.buyer || "").toLowerCase();
//         const seller = String(c.seller || "").toLowerCase();
//         const [buyerUser, sellerUser] = await Promise.all([
//           buyer ? User.findOne({ email: buyer }).lean() : null,
//           seller ? User.findOne({ email: seller }).lean() : null,
//         ]);
//         return {
//           ...c,
//           buyerNickname: buyerUser?.nickname || "Unknown",
//           sellerNickname: sellerUser?.nickname || "Unknown",
//         };
//       })
//     );

//     res.json(enriched);
//   } catch (err) {
//     console.error("❌ 대화 목록 불러오기 실패:", err);
//     res.status(500).json({ message: "Failed to load conversations." });
//   }
// });


// module.exports = router;



// backend/routes/chat.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router({ mergeParams: true });

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

router.use(requireAuth, schoolGuard);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// helper: ensure user is participant and in same school
async function authorizeConversation(conversationId, userEmail, userSchool) {
  if (!isValidId(conversationId)) return { ok: false, code: 400, msg: "Invalid conversation id" };

  const convo = await Conversation.findById(conversationId);
  if (!convo) return { ok: false, code: 404, msg: "Conversation not found" };

  const isParticipant = [convo.buyer, convo.seller].includes(userEmail);
  if (!isParticipant) return { ok: false, code: 403, msg: "Not a participant" };
  if (convo.school !== userSchool) return { ok: false, code: 403, msg: "Wrong tenant" };

  return { ok: true, convo };
}

/**
 * GET /conversations
 * - 내 학교 + 내가 참여중인 대화 목록
 */
router.get("/conversations", async (req, res) => {
  try {
    const email = req.user.email;
    const school = req.user.school;

    const list = await Conversation.find({
      school,
      $or: [{ buyer: email }, { seller: email }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(list);
  } catch (err) {
    console.error("List conversations error:", err);
    res.status(500).json({ message: "Failed to load conversations." });
  }
});

/**
 * GET /conversations/:id
 * - 대화 상세
 */
router.get("/conversations/:id", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });
    res.json(auth.convo);
  } catch (err) {
    console.error("Conversation detail error:", err);
    res.status(500).json({ message: "Failed to load conversation." });
  }
});

/**
 * GET /conversations/:id/messages?cursor=<ISO>&limit=50
 * - 메시지 목록 (최신순 페이징)
 */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });

    const { cursor, limit = 50 } = req.query;
    const q = { conversationId: auth.convo._id };
    if (cursor) q.createdAt = { $lt: new Date(cursor) };

    const items = await Message.find(q).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(items);
  } catch (err) {
    console.error("List messages error:", err);
    res.status(500).json({ message: "Failed to load messages." });
  }
});

/**
 * POST /conversations/:id/messages
 * - 메시지 전송 (참가자만)
 * body: { content }
 */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });

    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    const msg = await Message.create({
      conversationId: auth.convo._id,
      sender: req.user.email,
      content,
      school: req.user.school,
    });

    auth.convo.lastMessage = content;
    auth.convo.updatedAt = new Date();
    await auth.convo.save();

    res.status(201).json(msg);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message." });
  }
});

/**
 * POST /start
 * - 새 대화 시작
 * body: { peerEmail, itemId? }
 */
router.post("/start", async (req, res) => {
  try {
    const { peerEmail, itemId = null } = req.body;
    const me = req.user.email;
    const school = req.user.school;

    if (!peerEmail || peerEmail === me) {
      return res.status(400).json({ message: "Invalid peerEmail" });
    }

    const peer = await User.findOne({ email: peerEmail }).select("school");
    if (!peer || peer.school !== school) {
      return res.status(403).json({ message: "Peer is not in your school." });
    }

    let convo = await Conversation.findOne({
      school,
      $or: [
        { buyer: me, seller: peerEmail },
        { buyer: peerEmail, seller: me },
      ],
      ...(itemId ? { itemId } : {}),
    });

    if (!convo) {
      const roles = { buyer: me, seller: peerEmail }; // arbitrary
      convo = await Conversation.create({ ...roles, itemId, school });
    }

    res.status(201).json(convo);
  } catch (err) {
    console.error("Start conversation error:", err);
    res.status(500).json({ message: "Failed to start conversation." });
  }
});

/**
 * POST /conversations/:id/read
 * - 읽음 처리
 */
router.post("/conversations/:id/read", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });

    await Message.updateMany(
      { conversationId: auth.convo._id, readBy: { $ne: req.user.email }, sender: { $ne: req.user.email } },
      { $addToSet: { readBy: req.user.email } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Failed to mark as read." });
  }
});

module.exports = router;




