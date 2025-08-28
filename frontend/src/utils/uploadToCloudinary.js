// // ✅ src/utils/uploadToCloudinary.js
// export const uploadToCloudinary = async (file) => {
//     const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
//     const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
//     const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("upload_preset", preset);
  
//     const res = await fetch(url, {
//       method: "POST",
//       body: formData,
//     });
  
//     const data = await res.json();
//     return data.secure_url; // ✅ 업로드된 이미지 URL 반환
//   };


// ✅ src/utils/uploadToCloudinary.js
// Unsigned upload to Cloudinary with resource_type=auto
// - Supports images, pdf/docx/pptx/xls/txt/md, etc.
// - Returns the full JSON response (secure_url, public_id, bytes, resource_type, format, ...)

export const uploadToCloudinary = async (
  file,
  {
    folder = "",        // e.g., "materials"
    tags = [],          // e.g., ["coursehub", "notes"]
    resourceType = "auto", // "auto" covers images/docs/etc.
  } = {}
) => {
  if (!file) throw new Error("No file to upload");

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    throw new Error("Missing Cloudinary env: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET");
  }

  // Use auto to allow arbitrary file types (images, pdfs, docs...)
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  if (folder) formData.append("folder", folder);
  if (Array.isArray(tags) && tags.length) formData.append("tags", tags.join(","));

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }
  const data = await res.json();

  // data includes: asset_id, public_id, version, version_id, signature, width/height (if image),
  // format, resource_type, created_at, tags, bytes, type, etag, placeholder, url, secure_url, original_filename ...
  return data;
};
