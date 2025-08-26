// src/components/MarketRequestForm.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const MarketRequestForm = ({ itemId, buyerEmail }) => {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sent | already

  useEffect(() => {
    const alreadySent = localStorage.getItem(`requestSent-${itemId}`);
    if (alreadySent) setStatus("already");
  }, [itemId]);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/market/request`, {
        itemId,
        buyer: buyerEmail,
        message,
      });

      localStorage.setItem(`requestSent-${itemId}`, "true");
      setStatus("sent");
    } catch (err) {
      console.error("❌ 요청 실패:", err);
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
        ✅ Message Sent Successfully !!
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center mt-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="문의 사항을 적어 주세요!"
        className="border px-3 py-2 rounded flex-1 bg-red-50"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-200 text-indigo-600 font-semibold px-4 py-2 rounded"
      >
        Send
      </button>
    </div>
  );
};

export default MarketRequestForm;
