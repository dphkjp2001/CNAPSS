// ✅ src/utils/uploadToCloudinary.js
export const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
  
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
  
    const data = await res.json();
    return data.secure_url; // ✅ 업로드된 이미지 URL 반환
  };