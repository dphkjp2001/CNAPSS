// frontend/src/pages/market/MarketDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
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

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-5xl">
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

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Images */}
          <div className="md:col-span-2">
            {Array.isArray(item.images) && item.images.length > 0 ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <img
                    src={item.images[0]}
                    alt="cover"
                    className="w-full object-cover"
                    style={{ aspectRatio: "4/3" }}
                  />
                </div>
                {item.images.length > 1 && (
                  <div className="mt-3 flex gap-2">
                    {item.images.slice(1).map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`thumb ${i + 2}`}
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-gray-200"
                      />
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

          {/* Right panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xl font-semibold text-gray-900">
                {currency.format(item.price)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Seller:{" "}
                <span className="font-medium">
                  {item.sellerNickname || "Unknown"}
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
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








