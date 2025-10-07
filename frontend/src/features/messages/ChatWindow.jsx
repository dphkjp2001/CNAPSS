import React from "react";
import { useParams } from "react-router-dom";
import { listMessages, sendMessage, markRead } from "../../api/chat.api.js";
import { useSocket } from "../../contexts/SocketContext.jsx";

export default function ChatWindow({ conversationId }) {
  const { school } = useParams();
  const socket = useSocket();
  const [items, setItems] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [theirTyping, setTheirTyping] = React.useState(false);

  React.useEffect(() => {
    setItems([]);
    if (!conversationId) return;
    (async () => {
      const msgs = await listMessages(school, conversationId, { limit: 30 });
      setItems(msgs);
      // join room
      socket?.emit("conversation:join", { conversationId });
      await markRead(school, conversationId);
    })();
  }, [school, conversationId, socket]);

  React.useEffect(() => {
    if (!socket || !conversationId) return;
    const onNew = (m) => {
      if (m.conversationId !== conversationId) return;
      setItems(prev => [...prev, m]);
    };
    const onRead = (payload) => {
      // optional UI hook to show read state
    };
    const onTypingStart = (payload) => {
      if (payload.conversationId === conversationId) setTheirTyping(true);
    };
    const onTypingStop = (payload) => {
      if (payload.conversationId === conversationId) setTheirTyping(false);
    };
    socket.on("message:new", onNew);
    socket.on("conversation:read", onRead);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    return () => {
      socket.off("message:new", onNew);
      socket.off("conversation:read", onRead);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, [socket, conversationId]);

  // typing signals
  React.useEffect(() => {
    if (!socket || !conversationId) return;
    if (typing) socket.emit("typing:start", { conversationId });
    const t = setTimeout(() => {
      setTyping(false);
      socket.emit("typing:stop", { conversationId });
    }, 1200);
    return () => clearTimeout(t);
  }, [typing, socket, conversationId]);

  async function send() {
    const text = input.trim();
    if (!text || !conversationId) return;
    setInput("");
    const res = await sendMessage(school, conversationId, { body: text });
    setItems(prev => [...prev, res]);
  }

  if (!conversationId) return (
    <div className="h-full flex items-center justify-center text-gray-500">
      Select a conversation
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-2">Chat</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.map(m => (
          <div key={m._id} className={`max-w-[70%] ${m.mine ? "ml-auto text-right" : ""}`}>
            <div className="text-xs text-gray-500 mb-0.5">{m.senderAlias}</div>
            <div className={`inline-block px-3 py-2 rounded-2xl ${m.mine ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
              {m.body}
            </div>
            <div className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
        {theirTyping && <div className="text-xs text-gray-500">peer is typing…</div>}
      </div>
      <div className="border-t p-2 flex gap-2">
        <input
          className="flex-1 border rounded-full px-4 py-2"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setTyping(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <button className="px-4 py-2 rounded-full bg-gray-900 text-white" onClick={send}>Send</button>
      </div>
    </div>
  );
}
