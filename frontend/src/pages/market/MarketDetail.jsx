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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sent | already
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getItem({ school, token: user?.token || localStorage.getItem("token")?.replace(/^Bearer /,""), id });
        setItem(data);
        setMainImg(Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null);
      } catch (e) {
        console.error("load item failed", e);
        setErr("Failed to load the listing.");
      }
    })();

    if (user) {
      (async () => {
        try {
          const r = await checkRequest({ school, token: localStorage.getItem("token")?.replace(/^Bearer /,""), itemId: id, email: user.email });
         if (r.alreadySent) setStatus("already");
        } catch (e) {
          console.error("request-check failed", e);
        }
      })();
    }
  }, [id, user, school]);

  const isOwner = useMemo(
    () => !!(user?.email && item?.seller && user.email === item.seller),
    [user, item]
  );

  const handleDelete = async () => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await apiDelete({ school, token: localStorage.getItem("token")?.replace(/^Bearer /,""), id });
      navigate(schoolPath("/market"));
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  };

  const handleSendRequest = async () => {
    if (!message.trim()) return;
    try {
      const { conversationId } = await sendRequest({
               school,
               token: localStorage.getItem("token")?.replace(/^Bearer /,""),
               itemId: id,
               buyer: user.email,
               message,
             });
      if (conversationId) navigate(schoolPath(`/messages?conversation=${conversationId}`));
      else alert("Unexpected server response.");
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
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme.bg }}
    >
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
                  <img
                    src={mainImg}
                    alt="main"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[4/3] w-full" />
                )}
              </button>

              {/* Thumbnails: click to change main */}
              {Array.isArray(item.images) && item.images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {item.images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainImg(url)}
                      className={`overflow-hidden rounded-lg border ${
                        mainImg === url ? "border-gray-900" : "border-gray-200"
                      } bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/15`}
                      aria-label={`thumbnail ${i + 1}`}
                    >
                      <img
                        src={url}
                        alt={`thumbnail ${i + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info & Actions */}
            <div className="sm:col-span-2 flex flex-col">
              <div className="prose prose-sm max-w-none text-gray-800">
                <p className="whitespace-pre-wrap leading-relaxed">{item.description}</p>
              </div>

              {isOwner ? (
                <div className="mt-6 flex gap-2">
                  <Link
                    to={schoolPath(`/market/${id}/edit`)}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                    style={{ backgroundColor: schoolTheme.primary }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              ) : user ? (
                <div className="mt-6">
                  {status === "already" ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      You’ve already sent a request.
                      <Link to={schoolPath("/messages")} className="ml-2 font-medium text-blue-600 underline">
                        Go to Chat 💬
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask about pickup, availability, condition, etc."
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                      <button
                        onClick={handleSendRequest}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                        style={{ backgroundColor: schoolTheme.primary }}
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  Please <Link className="text-blue-600 underline" to={schoolPath("/login")}>log in</Link> to contact the seller.
                </div>
              )}
            </div>
          </div>

          {err && (
            <div className="border-t border-gray-100 px-5 py-4 text-sm text-red-700 sm:px-6">
              {err}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && mainImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={mainImg}
            alt="zoomed"
            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
}




