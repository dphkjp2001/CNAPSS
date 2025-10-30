// scripts/fixPostIndexes.js
require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("../models/Post");

(async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const indexes = await Post.collection.indexes();
    const indexNames = indexes.map(i => i.name);

    const targetIndexes = [
      "school_1_shortId_1",
      "school_1_slug_1",
      "school_1_publicId_1",
    ];

    for (const idx of targetIndexes) {
      if (indexNames.includes(idx)) {
        await Post.collection.dropIndex(idx);
        console.log(`🗑️ Dropped old index: ${idx}`);
      } else {
        console.log(`ℹ️ Index ${idx} not found — skipping`);
      }
    }

    const cleanResult = await Post.updateMany(
      {
        $or: [
          { shortId: null },
          { slug: null },
          { publicId: null },
        ],
      },
      {
        $unset: {
          shortId: "",
          slug: "",
          publicId: "",
        },
      }
    );
    console.log(`🧹 Cleaned ${cleanResult.modifiedCount} documents with null IDs`);

    // ✅ Recreate partial unique indexes safely
    await Promise.all([
      Post.collection.createIndex(
        { school: 1, shortId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            shortId: { $exists: true, $type: "string" },
          },
        }
      ),
      Post.collection.createIndex(
        { school: 1, slug: 1 },
        {
          unique: true,
          partialFilterExpression: {
            slug: { $exists: true, $type: "string" },
          },
        }
      ),
      Post.collection.createIndex(
        { school: 1, publicId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            publicId: { $exists: true, $type: "string" },
          },
        }
      ),
    ]);

    console.log("✅ Created new partial unique indexes on shortId, slug, and publicId");
    console.log("🎉 Migration complete");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
})();
