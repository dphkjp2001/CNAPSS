import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";

const MarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { schoolTheme } = useSchool();
  const baseURL = import.meta.env.VITE_API_URL;

  const [item, setItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sent | already

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await axios.get(`${baseURL}/market/${id}`);
        setItem(res.data);
      } catch (err) {
        console.error("❌ 게시글 불러오기 실패", err);
      }
    };
    fetchItem();

    // ✅ DB 기준으로 이미 요청 보냈는지 확인
    if (user) {
      const checkSent = async () => {
        try {
          const res = await axios.get(`${baseURL}/market/request/${id}/${user.email}`);
          if (res.data.alreadySent) setStatus("already");
        } catch (err) {
          console.error("❌ 문의 여부 확인 실패", err);
        }
      };
      checkSent();
    }
  }, [id, baseURL, user]);

  const handleDelete = async () => {
    const confirmDelete = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${baseURL}/market/${id}`);
      navigate("/market");
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const handleSendRequest = async () => {
    if (!message.trim()) return;
  
    try {
      const res = await axios.post(`${baseURL}/market/request`, {
        itemId: id,
        buyer: user.email,
        message,
      });
  
      const { conversationId } = res.data;
  
      if (conversationId) {
        // ✅ 대화방 ID로 이동
        navigate(`/messages?conversation=${conversationId}`);
      } else {
        console.error("❌ 서버에서 conversationId를 받지 못했어요:", res.data);
        alert("서버 응답에 문제가 있습니다.");
      }
    } catch (err) {
      console.error("❌ 문의 전송 실패:", err);
      alert("전송 중 문제가 발생했습니다.");
    }
  };
  
  

  if (!item) return <div className="p-6">로딩 중...</div>;

  const isOwner = user?.email === item.seller;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: schoolTheme.bg }}>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-2xl font-bold">{item.title}</h2>
        <p className="text-gray-700">{item.description}</p>
        <p className="text-gray-800 font-semibold">💵 ${item.price}</p>
        <p className="text-sm text-gray-400">판매자: {item.sellerNickname}</p>

        {item.images && item.images.length > 0 && (
          <div className="flex gap-3 mt-4 overflow-x-auto">
            {item.images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`판매 이미지-${i}`}
                className="w-40 h-40 object-cover rounded border cursor-pointer"
                onClick={() => setSelectedImage(url)}
              />
            ))}
          </div>
        )}

        {/* ✅ 판매자 전용 수정/삭제 버튼 */}
        {isOwner && (
          <div className="flex gap-3 mt-4">
            <Link
              to={`/market/${id}/edit`}
              className="px-4 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700"
            >
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-1.5 rounded bg-red-500 text-white hover:bg-red-600"
            >
              삭제
            </button>
          </div>
        )}

        {/* ✅ 구매자용 1회성 문의 메시지 */}
        {!isOwner && user && (
          <div className="mt-6">
            {status === "already" && (
              <div className="border p-4 rounded bg-gray-100 text-center text-gray-700">
                📨 Request already sent.
                <Link to="/messages" className="ml-2 text-blue-600 underline">
                  Go to Chat 💬
                </Link>
              </div>
            )}
            {status === "sent" && (
              <div className="border p-4 rounded bg-green-100 text-center text-green-700">
                ✅ Message Sent Successfully!
                <Link to="/messages" className="ml-2 text-blue-600 underline">
                  Go to Chat 💬
                </Link>
              </div>
            )}
            {status === "idle" && (
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="문의 사항을 적어 주세요!"
                  className="border px-3 py-2 rounded flex-1 bg-red-50"
                />
                <button
                  onClick={handleSendRequest}
                  className="bg-blue-200 text-indigo-600 font-semibold px-4 py-2 rounded"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ 이미지 확대 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="확대 이미지"
            className="max-w-[90vw] max-h-[90vh] rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default MarketDetail;


