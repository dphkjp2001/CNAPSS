// ✅ src/pages/market/MarketList.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import axios from "axios";

const MarketList = () => {
  const [items, setItems] = useState([]);
  const { school, schoolTheme } = useSchool();
  const baseURL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get(`${baseURL}/market`);
        setItems(res.data);
      } catch (err) {
        console.error("❌ 게시글 불러오기 실패", err);
      }
    };

    fetchItems();
  }, [baseURL]);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: schoolTheme.bg }}>
      <div className="max-w-5xl mx-auto">
        {/* ✅ 상단 헤더 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: schoolTheme.text }}>
            중고마켓
          </h2>
          <div className="flex gap-2">
            <Link
              to="/messages"
              className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              💬 내 채팅 목록
            </Link>
            <Link
              to="/market/write"
              className="px-4 py-1.5 rounded text-white"
              style={{ backgroundColor: schoolTheme.primary }}
            >
              + 판매 글 작성
            </Link>
          </div>
        </div>

        {/* ✅ 게시글 리스트 */}
        {items.length === 0 ? (
          <p className="text-gray-500">등록된 글이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <Link
                to={`/market/${item._id}`}
                key={item._id}
                className="block bg-white rounded shadow hover:shadow-md transition overflow-hidden"
              >
                {item.images && item.images[0] && (
                  <img
                    src={item.images[0]}
                    alt="썸네일"
                    className="w-full h-48 object-cover border-b"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-700">${item.price}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.seller}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketList;
