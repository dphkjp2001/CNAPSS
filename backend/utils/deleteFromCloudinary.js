// backend/utils/deleteFromCloudinary.js
const axios = require("axios");

const deleteFromCloudinary = async (imageUrl) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  try {
    const parts = imageUrl.split("/");
    const publicIdWithExt = parts.slice(-2).join("/");
    const publicId = publicIdWithExt.replace(/\.[a-zA-Z]+$/, "");

    await axios.delete(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
      {
        auth: { username: apiKey, password: apiSecret },
        data: { public_ids: [publicId] },
      }
    );

    console.log("✅ Cloudinary 삭제 완료:", publicId);
  } catch (err) {
    console.error("❌ Cloudinary 삭제 실패:", err.response?.data || err.message);
  }
};

module.exports = { deleteFromCloudinary };
