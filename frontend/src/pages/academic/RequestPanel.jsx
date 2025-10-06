// frontend/src/pages/academic/RequestPanel.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useLoginGate } from "../../hooks/useLoginGate";
import { checkRequested, sendRequest } from "../../api/request";
import AsyncButton from "../../components/AsyncButton"; // ✅ fixed: two levels up

export default function RequestPanel({ postId, authorEmail }) {
  const { user } = useAuth();
  const { school } = useSchool();
  const { ensureAuth } = useLoginGate();

  const [status, setStatus] = useState("idle"); // idle | checking | already | sent | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!postId || !school || !user) return;
      try {
        setStatus("checking");
        const data = await checkRequested({ school, targetId: postId });
        if (!alive) return;
        setStatus(data?.exists ? "already" : "idle");
      } catch {
        if (alive) setStatus("idle");
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, postId, user]);

  const onSend = async () => {
    if (!user) {
      ensureAuth();
      return;
    }
    const text = message.trim();
    if (!text) return;
    try {
      const res = await sendRequest({ school, targetId: postId, initialMessage: text });
      if (res?.ok) setStatus("sent");
      else setStatus("error");
    } catch (e) {
      if (e?.status === 409) setStatus("already");
      else setStatus("error");
    }
  };

  if (!user) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-gray-700">Log in to send a message to the author.</div>
        <div className="mt-2 text-xs text-gray-500">You’ll be redirected back after signing in.</div>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="rounded-xl border bg-green-50 p-4 text-green-800">
        ✅ You’ve already sent a request. Check your Messages.
      </div>
    );
  }
  if (status === "sent") {
    return (
      <div className="rounded-xl border bg-green-50 p-4 text-green-800">
        ✅ Request sent! The author will receive your message.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold">Send a request to the author</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Introduce yourself (course, schedule, or goal)"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <AsyncButton
          onClick={onSend}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
          loadingText="Sending…"
          disabled={!message.trim()}
        >
          Send request
        </AsyncButton>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Only available for Academic “Looking for” posts. Comments are disabled.
      </div>
    </div>
  );
}

