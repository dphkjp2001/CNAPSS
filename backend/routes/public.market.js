// backend/routes/public.market.js
const express = require("express");
const router = express.Router({ mergeParams: true });

const MarketItem = require("../models/MarketItem");
const User = require("../models/User");

// Allow-list for schools (mirror other public routes)
const ALLOWED_SCHOOLS = new Set(["nyu", "columbia", "boston"]);

const sanitize = (v) => String(v ?? "").trim();
const low = (v) => sanitize(v).toLowerCase();

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

/** Attach sellerNickname from User collection (email → nickname) */
async function attachNicknames(items) {
  const arr = Array.isArray(items) ? items : [items];
  const emails = [
    ...new Set(
      arr
        .map((i) => low(i.seller))
        .filter(Boolean)
    ),
  ];
  if (!emails.length) return items;

  const users = await User.find({ email: { $in: emails } })
    .select("email nickname")
    .lean();
  const nickMap = Object.fromEntries(
    users.map((u) => [low(u.email), u.nickname || ""])
  );

  const mapOne = (i) => ({
    ...i,
    sellerNickname: nickMap[low(i.seller)] || "Unknown",
  });

  return Array.isArray(items) ? items.map(mapOne) : mapOne(items);
}

/**
 * GET /api/public/:school/market/recent?limit=5
 * - dashboard preview (no auth)
 * - show available/reserved only (exclude sold/archived if any)
 */
router.get("/recent", async (req, res) => {
  try {
    const school = low(req.params.school);
    if (!ALLOWED_SCHOOLS.has(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }
    const limit = Math.min(20, toInt(req.query.limit, 5));

    const filter = { school, status: { $ne: "sold" } };
    let items = await MarketItem.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Keep only safe fields for public listing
    items = items.map((m) => ({
      id: m._id,
      title: m.title,
      price: m.price,
      image: (m.images && m.images[0]) || "",
      seller: m.seller, // used only to resolve nickname, not exposed to UI
      status: m.status,
      createdAt: m.createdAt,
    }));

    items = await attachNicknames(items);
    items = items.map(({ seller, ...safe }) => safe); // drop raw email

    res.json({ items });
  } catch (err) {
    console.error("public.market /recent error:", err);
    res.status(500).json({ message: "Failed to load market preview." });
  }
});

/**
 * GET /api/public/:school/market
 * Query: page=1&pageSize=20&q=&sort=new|price-asc|price-desc
 * - full listing page (no auth) with pagination
 */
router.get("/", async (req, res) => {
  try {
    const school = low(req.params.school);
    if (!ALLOWED_SCHOOLS.has(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(50, toInt(req.query.pageSize || req.query.limit, 20));
    const q = sanitize(req.query.q);
    const sortKey = sanitize(req.query.sort) || "new";

    const filter = { school, status: { $ne: "sold" } };
    if (q) {
      // simple search on title/description
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    let sort = { createdAt: -1 };
    if (sortKey === "price-asc") sort = { price: 1, createdAt: -1 };
    if (sortKey === "price-desc") sort = { price: -1, createdAt: -1 };

    const [total, docs] = await Promise.all([
      MarketItem.countDocuments(filter),
      MarketItem.find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    let items = docs.map((m) => ({
      id: m._id,
      title: m.title,
      price: m.price,
      image: (m.images && m.images[0]) || "",
      seller: m.seller,
      status: m.status,
      location: m.location || "",
      createdAt: m.createdAt,
    }));

    items = await attachNicknames(items);
    items = items.map(({ seller, ...safe }) => safe);

    res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("public.market list error:", err);
    res.status(500).json({ message: "Failed to load market listing." });
  }
});

module.exports = router;
