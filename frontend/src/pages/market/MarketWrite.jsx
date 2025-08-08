// ✅ src/pages/market/MarketWrite.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

const MarketWrite = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school } = useSchool();
  const baseURL = import.meta.env.VITE_API_URL;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState([]); // preview용
  const [imageFiles, setImageFiles] = useState([]); // 파일 원본
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 3); // 최대 3장
    setImages(files.map((file) => URL.createObjectURL(file)));
    setImageFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !price) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      // Cloudinary에 이미지 업로드
      const uploadedImageURLs = [];
      for (const file of imageFiles) {
        const url = await uploadToCloudinary(file);
        uploadedImageURLs.push(url);
      }

      await axios.post(`${baseURL}/market`, {
        title,
        description,
        price: parseFloat(price),
        school,
        seller: user?.email,
        images: uploadedImageURLs,
      });

      alert("등록이 완료되었습니다.");
      navigate("/market");
    } catch (err) {
      console.error(err);
      alert("글 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p className="text-center mt-10">로딩 중...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-purple-700">중고 물품 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">제목</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-semibold">설명</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-28 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-semibold">가격 ($)</label>
          <input
            type="number"
            min="0"
            className="w-full border rounded px-3 py-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-semibold">이미지 (최대 3장)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <div className="flex gap-2 mt-2">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`미리보기-${i}`}
                className="w-24 h-24 object-cover rounded border"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "등록 중..." : "등록하기"}
        </button>
      </form>
    </div>
  );
};

export default MarketWrite;


