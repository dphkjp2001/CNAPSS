// src/pages/market/MarketDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getItem, checkRequest, sendRequest, deleteItem as apiDelete } from "../../api/market";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = (user?.token || localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [item, setItem] = useState(null);
  const [mainImg, setMainImg] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | already
  const [conversationId, setConversationId] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getItem({ school, token, id });
        setItem(data);
        setMainImg(Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null);
      } catch (e) {
        console.error("load item failed", e);
        setErr("Failed to load the listing.");
      }
    })();

    // 이미 보냈는지 확인 (통합 라우트)
    if (token) {
      (async () => {
        try {
          const r = await checkRequest({ school, token, itemId: id });
          if (r?.alreadySent) {
            setStatus("already");
            if (r.conversationId) setConversationId(r.conversationId);
          }
        } catch (e) {
          // 무시 (표시만 없앰)
        }
      })();
    }
  }, [id, school, token]);

  const isOwner = useMemo(
    () => !!(user?.email && item?.seller && user.email === item.seller),
    [user, item]
  );

  const handleDelete = async () => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await apiDelete({ school, token, id });
      navigate(schoolPath("/market"));
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  };

  const handleSendRequest = async () => {
    const msg = String(message || "").trim();
    if (!msg) return;

    try {
      const r = await sendRequest({
        school,
        token,
        itemId: id,
        message: msg, // 🔑 buyer 는 보내지 않음 (서버가 JWT에서 읽음)
      });

      // 성공 또는 이미 존재하던 대화방 id로 이동
      const convId = r?.conversationId || conversationId;
      if (convId) {
        navigate(schoolPath(`/messages?conversation=${convId}`));
      } else if (r?.alreadySent) {
        alert("You've already sent a request for this item.");
      } else {
        alert("Unexpected server response.");
      }
    } catch (e) {
      console.error("send request failed", e);
      alert("Failed to send the message.");
    }
  };

  if (!item) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        {err || "Loading…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6" style={{ backgroundColor: schoolTheme.bg }}>
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-gray-900">
                {currency.format(Number(item.price) || 0)}
              </span>
              {item.sellerNickname && (
                <span className="text-gray-500">Seller: {item.sellerNickname}</span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-5 sm:p-6">
            {/* Left: Images */}
            <div className="sm:col-span-3">
              {/* Main image */}
              <button
                type="button"
                disabled={!mainImg}
                onClick={() => mainImg && setLightboxOpen(true)}
                className="block w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                aria-label="open image in lightbox"
              >
                {mainImg ? (
                  <img src={mainImg} alt="main" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="aspect-[4/3] w-full" />
                )}
              </button>

              {/* Thumbs */}
              {Array.isArray(item.images) && item.images.length > 1 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {item.images.map((src, i) => (
                    <button
                      key={i}
                      className={`overflow-hidden rounded border ${src === mainImg ? "border-indigo-500" : "border-gray-200"}`}
                      onClick={() => setMainImg(src)}
                    >
                      <img src={src} alt={`thumb-${i}`} className="aspect-[4/3] w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Description + request box */}
            <div className="sm:col-span-2">
              <p className="text-gray-700 mb-4 whitespace-pre-line">{item.description}</p>

              {status === "already" ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  You’ve already sent a request.&nbsp;
                  {conversationId ? (
                    <Link
                      to={schoolPath(`/messages?conversation=${conversationId}`)}
                      className="text-indigo-600 hover:underline"
                    >
                      Go to Chat
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-indigo-200"
                  />
                  <button
                    onClick={handleSendRequest}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Send
                  </button>
                </div>
              )}

              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="mt-6 text-xs text-red-500 hover:underline"
                >
                  Delete this listing
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 간단 라이트박스 */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <button
            className="absolute right-6 top-6 rounded-full bg-white/90 px-3 py-1 text-sm shadow"
            onClick={() => setLightboxOpen(false)}
          >
            Close
          </button>
          {mainImg && <img src={mainImg} alt="full" className="max-h-[85vh] rounded-xl shadow-2xl" />}
        </div>
      )}
    </div>
  );
}






