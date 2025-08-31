// // src/pages/messages/Messages.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatBox from "../../components/Chatbox";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import * as chatApi from "../../api/chat";

/** 좌측 목록 + 우측 대화, 미읽음 배지/미리보기 실시간 반영 */
export default function Messages() {
  const { user, token } = useAuth() || {};
  const { school: schoolParam } = useParams();
  const [searchParams] = useSearchParams();
  const { on, off } = useSocket();

  const school = useMemo(
    () => String(schoolParam || localStorage.getItem("selectedSchool") || "").toLowerCase(),
    [schoolParam]
  );

  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);

  const myEmail = (user?.email || "").toLowerCase();
  // put near the top helpers
  const emailLocal = (v) => (String(v || "").split("@")[0] || "").trim();

  // nickname first → else email local-part → else "Unknown"
  const otherNickname = (c) => {
  const iAmBuyer = (c?.buyer || "").toLowerCase() === myEmail;
  const nick = iAmBuyer ? c?.sellerNickname : c?.buyerNickname;
  const other = iAmBuyer ? c?.seller : c?.buyer;
  return (nick && nick !== "Unknown" ? nick : emailLocal(other)) || "Unknown";
};
  const otherEmail = (c) =>
    ((c?.buyer || "").toLowerCase() === myEmail ? c?.seller : c?.buyer) || "";

  const unreadCount = (c) =>
    (c?.messages || []).filter(
      (m) => (m.sender || "").toLowerCase() !== myEmail && !(m.readBy || []).includes(myEmail)
    ).length;

  const refresh = useCallback(async () => {
    if (!token || !school) return;
    try {
      const data = await chatApi.getConversations({ school, token }); // 최신순
      setConvos(Array.isArray(data) ? data : []);

      const paramId = searchParams.get("conversation");
      if (paramId) {
        const found = (data || []).find((c) => c._id === paramId);
        if (found) setSelected(found);
      } else if (!selected && (data || []).length > 0) {
        setSelected(data[0]);
      }
    } catch {
      setConvos([]);
    }
  }, [token, school, searchParams, selected]);

  useEffect(() => { refresh(); }, [refresh]);

  // 실시간 미리보기(정렬/마지막 메시지) 반영
  useEffect(() => {
    const handlePreview = ({ conversationId, lastMessage, updatedAt }) => {
      setConvos((prev) => {
        const next = prev.map((c) => (c._id === conversationId ? { ...c, lastMessage, updatedAt } : c));
        // 최신 업데이트를 위로 올리기
        next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return next;
      });
    };
    on?.("chat:preview", handlePreview);
    return () => off?.("chat:preview", handlePreview);
  }, [on, off]);

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 왼쪽 목록 */}
      <div className="w-80 border-r p-4">
        <h2 className="mb-4 text-lg font-bold">💬 Messages</h2>
        <div className="space-y-2">
          {convos.length === 0 && <p className="text-sm text-gray-500">진행 중인 채팅이 없습니다.</p>}
          {convos.map((c) => (
            <div
              key={c._id}
              onClick={() => setSelected(c)}
              className={`relative cursor-pointer rounded-lg p-3 ${selected?._id === c._id ? "bg-blue-100" : "hover:bg-gray-100"}`}
            >
              <p className="font-medium">{otherNickname(c)}</p>
              <p className="truncate text-sm text-gray-500">{c.lastMessage || "(메시지 없음)"}</p>
              {unreadCount(c) > 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                  {unreadCount(c)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 우측 대화 */}
      <div className="flex-1 p-4">
        {selected ? (
          <ChatBox
            conversationId={selected._id}
            userEmail={user?.email}
            otherEmail={otherEmail(selected)}
            otherNickname={otherNickname(selected)}
            fullSize
          />
        ) : (
          <div className="mt-20 text-center text-gray-400">🧭 왼쪽에서 채팅을 선택하세요.</div>
        )}
      </div>
    </div>
  );
}


