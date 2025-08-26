// src/components/MarketRequestForm.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { apiFetch } from "../api/http";

const MarketRequestForm = ({ itemId }) => {
  const { token } = useAuth();
  const { school } = useSchool();

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sent | already | error
  const [loading, setLoading] = useState(false);

  // Check if already requested (server-side, scoped)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!token || !school || !itemId) return;
        const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
        const res = await apiFetch(`${base}/${school}/request/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive && data?.alreadySent) setStatus("already");
      } catch (err) {
        // silent; keep idle
        console.warn("Request check failed:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, school, itemId]);

  const handleSubmit = async () => {
    if (!message.trim() || !token || !school) return;
    setLoading(true);
    try {
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const res = await apiFetch(`${base}/${school}/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId, message }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setStatus("already");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      setStatus("sent");
    } catch (err) {
      console.error("❌ Failed to send request:", err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "already") {
    return (
      <div className="border p-4 rounded bg-gray-100 text-center text-gray-700">
        📨 Request already sent.
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="border p-4 rounded bg-green-100 text-center text-green-700">
        ✅ Message Sent Successfully!
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center mt-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a message to the seller"
        className="border px-3 py-2 rounded flex-1 bg-red-50"
        disabled={loading}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !token}
        className="bg-blue-600 text-white font-semibold px-4 py-2 rounded disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send"}
      </button>
    </div>
  );
};

export default MarketRequestForm;

