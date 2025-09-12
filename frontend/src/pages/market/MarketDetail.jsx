// frontend/src/pages/market/MarketDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import {
  getItem,
  deleteItem,
  sendRequest,
  checkRequest,
} from "../../api/market";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 🖼 active image index for gallery
  const [activeIndex, setActiveIndex] = useState(0);

  const isOwner = useMemo(
    () => !!user && !!item && user.email === item.seller,
    [user, item]
  );

  // Load item
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getItem({ school, token, id });
        if (!mounted) return;
        setItem(data);
        setActiveIndex(0); // reset when item changes
      } catch (e) {
        console.error(e);
        setErrorMsg(e?.payload?.message || "Failed to load the item.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [school, token, id]);

  // Check if request already sent (and get conversationId)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!item || isOwner || !user) return;
      try {
        const res = await checkRequest({ school, token, itemId: id });
        if (!mounted) return;
        setAlreadySent(!!res?.alreadySent);
        setConversationId(res?.conversationId || null);
      } catch (e) {
        console.warn("checkRequest failed:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [item, isOwner, user, school, token, id]);

  const onSend = async () => {
    const text = String(message || "").trim();
    if (!text) return;
    try {
      setSending(true);
      setErrorMsg("");

      const res = await sendRequest({
        school,
        token,
        itemId: id,
        message: text,
      });

      // update local UI
      setAlreadySent(true);
      setConversationId(res?.conversationId || null);
      setMessage("");

      // navigate to chat immediately
      if (res?.conversationId) {
        navigate(schoolPath(`messages`) + `?conversation=${res.conversationId}`);
      }
    } catch (e) {
      console.error("send request failed", e);
      setErrorMsg(e?.message || e?.payload?.message || "Failed to send request.");
    } finally {
      setSending(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await deleteItem({ school, token, id });
      navigate(schoolPath("/market"));
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.payload?.message || "Failed to delete the item.");
    }
  };

  const onEdit = () => {
    navigate(schoolPath(`/market/${id}/edit`));
  };

  // ↔️ keyboard navigation for gallery (left/right)
  const onKeyDown = useCallback(
    (e) => {
      if (!item?.images?.length) return;
      if (e.key === "ArrowRight") {
        setActiveIndex((i) => (i + 1) % item.images.length);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((i) => (i - 1 + item.images.length) % item.images.length);
      }
    },
    [item?.images?.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        Loading…
      </div>
    );
  }

  if (!item) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        Item not found.
      </div>
    );
  }

  const images = Array.isArray(item.images) ? item.images : [];
  const activeSrc = images[activeIndex];

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Title row */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow"
                style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* 💡 Layout balance: 5-column grid (3 : 2) on desktop */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* Images (span 3) */}
          <div className="md:col-span-3">
            {images.length > 0 ? (
              <>
                {/* Main image */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <img
                    src={activeSrc}
                    alt={`photo ${activeIndex + 1}`}
                    className="w-full h-full object-cover"
                    // Slightly taller than 4:3 to feel balanced against the right panel
                    style={{ aspectRatio: "5/4" }}
                  />
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Show photo ${i + 1}`}
                        onClick={() => setActiveIndex(i)}
                        className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-1 transition 
                          ${i === activeIndex ? "ring-gray-900" : "ring-gray-200 hover:ring-gray-300"}`}
                      >
                        <img
                          src={src}
                          alt={`thumb ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {i === activeIndex && (
                          <span className="pointer-events-none absolute inset-0 ring-2 ring-offset-1 ring-gray-900/80 rounded-lg" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500">
                No images
              </div>
            )}
          </div>

          {/* Right panel (span 2) */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">
                {currency.format(item.price)}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Seller:{" "}
                <span className="font-medium">
                  {item.sellerNickname || "Unknown"}
                </span>
              </div>

              <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {item.description || "No description"}
              </div>
            </div>

            {/* Request box — hidden when owner */}
            {!isOwner && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 text-sm font-medium text-gray-900">Send a request</div>

                {alreadySent ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-green-700">Request already sent.</div>
                    {conversationId && (
                      <button
                        onClick={() =>
                          navigate(
                            schoolPath(`messages`) +
                              (conversationId ? `?conversation=${conversationId}` : "")
                          )
                        }
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Open chat
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="Say hi and mention pickup/payment details…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={sending}
                    />
                    <button
                      onClick={onSend}
                      disabled={sending || !message.trim()}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error alert */}
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}









