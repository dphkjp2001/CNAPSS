// frontend/src/pages/messages/Messages.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatBox from "../../components/Chatbox";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import * as chatApi from "../../api/chat";

/**
 * ✅ 레거시 제거 버전
 * - Marketplace / CourseHub 관련 필터/배지/표시는 모두 삭제
 * - 오직 두 가지 소스만 사용:
 *    1) "looking_for"  → Academic Board Seeking 에서 생성된 DM
 *    2) "dm"           → 사용자가 직접 시작한 일반 DM
 * - 필터 탭: All / Seeking
 */
export default function Messages() {
  const { user, token } = useAuth() || {};
  const { school: schoolParam } = useParams();
  const [sp, setSp] = useSearchParams();
  const { on: onSocket } = useSocket() || {};

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // "all" | "looking_for"
  const [filter, setFilter] = useState("all");

  const school = (schoolParam || "").toLowerCase();
  const myEmail = useMemo(() => (user?.email || "").toLowerCase(), [user]);

  const fetchConversations = useCallback(async () => {
    if (!token || !school) return;
    setLoading(true);
    try {
      const rows = await chatApi.getConversations({ school, token });
      const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];
      setList(arr);
      return arr;
    } finally {
      setLoading(false);
    }
  }, [school, token]);

  // 초기 로드 + socket preview 시 새로고침
  useEffect(() => {
    let alive = true;
    (async () => {
      const arr = await fetchConversations();
      if (!alive) return;

      const qId = sp.get("conversation");
      if (qId && Array.isArray(arr)) {
        const found = arr.find((c) => String(c._id) === String(qId));
        if (found) {
          setSelected(found);
          setFilter(found?.source === "looking_for" ? "looking_for" : "all");
        }
      }
    })();

    const un = onSocket?.("chat:preview", () => {
      fetchConversations();
    });

    return () => {
      alive = false;
      if (typeof un === "function") un();
    };
  }, [fetchConversations, onSocket, sp]);

  // ---- helper ----
  const otherEmail = (c) => {
    const b = String(c?.buyer || "").toLowerCase();
    const s = String(c?.seller || "").toLowerCase();
    return b === myEmail ? s : b;
  };
  const displayNameFromEmail = (email) => (email ? String(email).split("@")[0] : "Unknown");

  const titleOf = (c) => {
    const t = c?.resourceTitle;
    if (t && t.trim()) return t;
    return displayNameFromEmail(otherEmail(c));
  };

  // 배지: looking_for / dm
  const typeBadge = (c) => (String(c?.source).toLowerCase() === "looking_for" ? "🎓 Seeking" : "💬 DM");

  const filtered = useMemo(() => {
    if (filter === "all") return list;
    return list.filter((c) => String(c?.source).toLowerCase() === "looking_for");
  }, [list, filter]);

  // URL 동기화
  useEffect(() => {
    const id = selected?._id ? String(selected._id) : null;
    const next = new URLSearchParams(sp.toString());
    if (id) next.set("conversation", id);
    else next.delete("conversation");
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-6xl gap-4 p-4">
      {/* 좌측 리스트 */}
      <div className="flex w-[340px] shrink-0 flex-col rounded-2xl border bg-white">
        {/* 탭(레거시 제거) */}
        <div className="flex flex-wrap gap-2 p-3">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          <Chip active={filter === "looking_for"} onClick={() => setFilter("looking_for")}>
            Academic Seeking
          </Chip>
        </div>

        <div className="min-h-0 grow overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Loading…</div>
          ) : !filtered?.length ? (
            <div className="p-3 text-sm text-gray-500">No conversations.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((c) => {
                const isSel = selected?._id === c._id;
                return (
                  <li key={c._id}>
                    <button
                      onClick={() => {
                        setSelected(c);
                        setFilter(String(c?.source).toLowerCase() === "looking_for" ? "looking_for" : "all");
                      }}
                      className={
                        "flex w-full items-center justify-between gap-2 px-3 py-3 text-left hover:bg-gray-50 " +
                        (isSel ? "bg-violet-50" : "")
                      }
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap rounded-full bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {typeBadge(c)}
                          </span>
                          <span className="truncate text-sm font-semibold text-gray-900">{titleOf(c)}</span>
                        </div>
                        {c.lastMessage ? (
                          <div className="truncate text-xs text-gray-500">{c.lastMessage}</div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 우측 채팅창 */}
      <div className="min-w-0 grow rounded-2xl border bg-white">
        {selected ? (
          <ChatBox
            conversationId={selected._id}
            userEmail={user?.email}
            otherEmail={otherEmail(selected)}
            otherNickname={titleOf(selected)}
            fullSize
          />
        ) : (
          <div className="mt-20 text-center text-gray-400">🧭 왼쪽에서 채팅을 선택하세요.</div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-xs font-semibold " +
        (active ? "bg-violet-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
      }
    >
      {children}
    </button>
  );
}







