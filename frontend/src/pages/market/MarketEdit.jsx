// ✅ src/pages/market/MarketEdit.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

const MarketEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolTheme } = useSchool();
  const baseURL = import.meta.env.VITE_API_URL;

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
  });
  const [loading, setLoading] = useState(true);
  const [newImageFiles, setNewImageFiles] = useState([]);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await axios.get(`${baseURL}/market/${id}`);
        const data = res.data;

        if (data.seller !== user?.email) {
          alert("권한이 없습니다.");
          navigate("/market");
        }

        setForm({
          title: data.title,
          description: data.description,
          price: data.price,
          images: data.images || [],
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        alert("글을 불러오는 데 실패했습니다.");
        navigate("/market");
      }
    };

    fetchItem();
  }, [id, user, navigate, baseURL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setNewImageFiles(files);
    setForm((prev) => ({ ...prev, images: files.map((f) => URL.createObjectURL(f)) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      let uploadedImages = form.images;
      if (newImageFiles.length > 0) {
        uploadedImages = [];
        for (const file of newImageFiles) {
          const url = await uploadToCloudinary(file);
          uploadedImages.push(url);
        }
      }

      await axios.put(`${baseURL}/market/${id}`, {
        ...form,
        price: parseFloat(form.price),
        images: uploadedImages,
      });

      navigate(`/market/${id}`);
    } catch (err) {
      alert("수정 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">로딩 중...</div>;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: schoolTheme.bg }}>
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4" style={{ color: schoolTheme.text }}>
          판매 글 수정
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />

          <div>
            <label className="block font-semibold">이미지 (최대 3장)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            <div className="flex gap-2 mt-2">
              {form.images.map((src, i) => (
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
            className="w-full text-white py-2 rounded"
            style={{ backgroundColor: schoolTheme.primary }}
          >
            저장하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default MarketEdit;



