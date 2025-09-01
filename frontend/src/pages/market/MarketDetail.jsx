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
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [item, setItem] = useState(null);
  const [mainImg, setMainImg] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | already
  const [err, setErr] = useState("");

  const token =
    user?.token || (localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getItem({ school, token, id });
        if (!alive) return;
        setItem(data);
        setMainImg(Array.isArray(data.images) && data.images.length ? data.images[0] : null);
      } catch (e) {
        if (!alive) return;
        console.error("load item failed", e);
        setErr("Failed to load the listing.");
      }
    })();

    if (user?.email) {
      (async () => {
        try {
          const r = await checkRequest({
            school,
            token,
            itemId: id,
            email: user.email,
          });
          if (r?.alreadySent) setStatus("already");
        } catch (e) {
          console.warn("request-check failed", e);
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [id, school, user?.email, token]);

  const isOwner = useMemo(
    () => !!(user?.email && item?.seller && user.email === item.seller),
    [user, item]
  );

  const onDelete = async () => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await apiDelete({ school, token, id });
      navigate(schoolPath("/market"));
    } catch {
      alert("Failed to delete.");
    }
  };

  const onSend = async () => {
    if (!message.trim()) return;
    try {
      const out = await sendRequest({
        school,
        token,
        itemId: id,
        buyer: user.email,
        message,
      });
      if (out.alreadySent && out.conversationId) {
        // 서버가 409 대신 기존 대화 ID를 줄 수도 있음
        navigate(schoolPath(`/messages?conversation=${out.conversationId}`));
        return;
      }
      if (out.conversationId) {
        navigate(schoolPath(`/messages?conversation=${out.conversationId}`));
        return;
      }
      // 혹시나 예상치 못한 응답이면 알림
      alert("Message sent, but couldn’t find the chat link.");
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
    <div className="mx-auto max-w-5xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{item.title || "Untitled"}</h1>
        {isOwner && (
          <button
            onClick={onDelete}
            className="rounded-md px-3 py-1.5 text-sm bg-red-500 text-white hover:bg-red-600"
          >
            Delete
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Images */}
        <div className="md:col-span-2">
          {mainImg ? (
            <img
              src={mainImg}
              alt=""
              className="w-full aspect-square object-cover rounded-xl border border-gray-200"
            />
          ) : (
            <div className="w-full aspect-square rounded-xl bg-gray-100 border border-gray-200" />
          )}

          {Array.isArray(item.images) && item.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {item.images.map((u, i) => (
                <button
                  key={u + i}
                  onClick={() => setMainImg(u)}
                  className={`w-24 h-24 rounded-lg overflow-hidden border ${
                    u === mainImg ? "border-violet-500" : "border-gray-200"
                  }`}
                >
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Side */}
        <aside className="md:col-span-1">
          <div className="text-xl font-medium">{currency.format(item.price || 0)}</div>
          <div className="text-sm text-gray-500 mt-1">
            Seller: <span className="font-medium">{item.sellerName || item.seller}</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">
            {item.description || "No description."}
          </p>

          {/* Request box */}
          <div className="mt-6 p-3 rounded-xl border border-gray-200">
            {status === "already" ? (
              <div className="text-sm">
                You’ve already sent a request.{" "}
                <Link
                  to={schoolPath("/messages")}
                  className="text-violet-600 hover:underline font-medium"
                >
                  Go to Chat
                </Link>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a short message…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                />
                <button
                  onClick={onSend}
                  className="rounded-lg px-4 py-2 bg-violet-600 text-white text-sm hover:bg-violet-700"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}





