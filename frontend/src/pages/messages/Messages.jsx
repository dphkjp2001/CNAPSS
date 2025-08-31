import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatBox from "../../components/Chatbox";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import * as chatApi from "../../api/chat";

/**
 * 기능/데이터 흐름은 그대로 두고, 표시만 개선:
 * - 타입 배지 (Market/CourseHub/DM)
 * - resourceTitle 우선 타이틀
 * - 닉네임 → 이메일 로컬 → "Unknown" 폴백
 * - 상단 필터칩(All/Market/CourseHub) — 클라이언트 사이드 필터
 */
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
  const [filter, setFilter] = useState("all"); // all | market | coursehub

  /* ---------------- helpers (UI only) ---------------- */
  const myEmail = (user?.email || "").toLowerCase();
  const emailLocal = (v) => (String(v || "").split("@")[0] || "").trim();

  const otherNick = (c) => {
    const iAmBuyer = (c?.buyer || "").toLowerCase() === myEmail;
    const nick = iAmBuyer ? c?.sellerNickname : c?.buyerNickname;
    const other = iAmBuyer ? c?.seller : c?.buyer;
    return (nick && nick !== "Unknown" ? nick : emailLocal(other)) || "Unknown";
  };

  const typeOf = (c) => {
    const src = (c?.source || "").toLowerCase();
    if (src === "market") return "market";
    if (src === "coursehub") return "coursehub";
    // 레거시 폴백: itemId 있으면 market로 취급
    if (c?.itemId) return "market";
    return "dm";
  };

  const typeBadge = (c) => {
    const t = typeOf(c);
    if (t === "market") return "🛒 Market";
    if (t === "coursehub") return "🎓 CourseHub";
    return "💬 DM";
    // DM은 지금은 거의 안 쓰겠지만 안전 폴백
  };

  const titleOf = (c) => c?.resourceTitle?.trim() || otherNick(c);

  const otherEmail = (c) => {
    const iAmBuyer = (c?.buyer || "").toLowerCase() === myEmail;
    return (iAmBuyer ? c?.seller : c?.buyer) || "";
  };

  const unreadCount = (c) =>
    (c?.messages || []).filter(
      (m) => (m.sender || "").toLowerCase() !== myEmail && !(m.readBy || []).includes(myEmail)
    ).length;

  /* ---------------- data load ---------------- */
  const refresh = useCallback(async () => {
    if (!token || !school) return;
    try {
      const data = await chatApi.getConversations({ school, token }); // 최신순 반환 가정
      const list = Array.isArray(data) ? data : [];
      setConvos(list);

      const paramId = searchParams.get("conversation");
      if (paramId) {
        const found = list.find((c) => c._id === paramId);
        if (found) setSelected(found);
      } else if (!selected && list.length > 0) {
        setSelected(list[0]);
      }
    } catch {
      setConvos([]);
    }
  }, [token, school, searchParams, selected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---------------- live preview reorder ---------------- */
  useEffect(() => {
    const handlePreview = ({ conversationId, lastMessage, updatedAt }) => {
      setConvos((prev) => {
        const next = prev.map((c) => (c._id === conversationId ? { ...c, lastMessage, updatedAt } : c));
        next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return next;
      });
    };
    on?.("chat:preview", handlePreview);
    return () => off?.("chat:preview", handlePreview);
  }, [on, off]);

  /* ---------------- filtered view ---------------- */
  const filtered = useMemo(() => {
    if (filter === "all") return convos;
    return convos.filter((c) => typeOf(c) === filter);
  }, [convos, filter]);

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left: list */}
      <div className="w-80 border-r p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">💬 Messages</h2>
        </div>

        {/* filter chips */}
        <div className="mb-3 flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "market", label: "Market" },
            { key: "coursehub", label: "CourseHub" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full border px-3 py-1 text-xs " +
                (filter === f.key ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">해당 필터에 대화가 없습니다.</p>
          )}

          {filtered.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelected(c)}
              className={`relative w-full text-left rounded-lg p-3 transition ${
                selected?._id === c._id ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="max-w-[10rem] truncate font-medium">{titleOf(c)}</p>
                <span className="ml-2 shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                  {typeBadge(c)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-gray-500">{c.lastMessage || "(메시지 없음)"}</p>

              {unreadCount(c) > 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                  {unreadCount(c)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: chat */}
      <div className="flex-1 p-4">
        {selected ? (
          <ChatBox
            conversationId={selected._id}
            userEmail={user?.email}
            otherEmail={otherEmail(selected)}
            otherNickname={titleOf(selected)} // 헤더 표시도 동일 타이틀 폴백
            fullSize
          />
        ) : (
          <div className="mt-20 text-center text-gray-400">🧭 왼쪽에서 채팅을 선택하세요.</div>
        )}
      </div>
    </div>
  );
}



