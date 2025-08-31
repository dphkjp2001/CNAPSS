// frontend/src/pages/courses/MaterialDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getMaterial } from "../../api/materials";
import { apiFetch } from "../../api/http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Map helpers
const prettyKind = (v) =>
  v === "note"
    ? "class note"
    : v === "syllabus"
    ? "syllabus"
    : v === "exam"
    ? "exam"
    : v === "slide"
    ? "slide"
    : v === "link"
    ? "link"
    : "other";

const prettyShare = (v) =>
  v === "in_person" ? "Prefer to share in person" : v === "online" ? "Prefer to share online" : "Doesn't matter";

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { school } = useSchool();
  const { token, user } = useAuth();
  const schoolPath = useSchoolPath();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [sendOk, setSendOk] = useState(false);

  // Load material (✅ use API helper so "/api/api" 중복 없음)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setFetchErr("");
        const res = await getMaterial({ school, token, id });
        if (!alive) return;
        setItem(res?.item || res);
      } catch (e) {
        if (!alive) return;
        setFetchErr("This posting was not found.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token, id]);

  const titleLine = useMemo(() => {
    if (!item) return "";
    // 너가 원한 상단 카드 레이아웃: 과목명(또는 코드만) 우선
    // 제목이 비어 있더라도 CourseWrite에서 courseCode는 필수이므로 안전
    if (item.courseTitle) return item.courseTitle;
    return item.courseCode || "Untitled";
  }, [item]);

  async function onSend() {
    setSendErr("");
    setSendOk(false);
    if (!token) {
      // 로그인 가드 없이 간단 처리
      return navigate("/auth-required");
    }
    if (!message.trim()) {
      setSendErr("Please type your message.");
      return;
    }
    try {
      setSending(true);
      // ⚠️ Request API: 기존 마켓과 동일 패턴 가정
      // POST /api/:school/request  { type: 'material', targetId, sellerId, message }
      const body = {
        type: "material",
        targetId: item?._id || id,
        sellerId: item?.sellerId || item?.userId || item?.authorId, // 백엔드 스키마 상 이름이 다를 수 있어 안전하게 다 시도
        message: message.trim(),
      };
      const res = await apiFetch(`${API}/${encodeURIComponent(school)}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("request failed");
      setSendOk(true);
      setMessage("");
    } catch (e) {
      setSendErr("Failed to send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl p-5">
          <div className="h-28 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-6 h-10 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (fetchErr || !item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl p-5">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back
          </button>
          <div className="rounded-2xl border bg-white p-4 text-sm text-red-600">{fetchErr || "This posting was not found."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-5">
        <div className="mb-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>

        {/* 상단 카드 */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">{titleLine}</h1>

          {/* professor (free text, may be empty) */}
          {item.professor ? (
            <div className="mt-1 text-sm text-gray-700">{item.professor}</div>
          ) : null}

          <div className="mt-3 space-y-1 text-sm text-gray-600">
            {item.semester ? <div className="text-gray-700">{item.semester.replace("-", " ").toUpperCase()}</div> : null}
            <div>{item.materialType ? item.materialType : "personal material"}</div>

            {/* 가격 */}
            <div>
              {item.isFree
                ? "Free"
                : typeof item.price === "number" && item.price > 0
                ? `$${item.price}`
                : "Price upon request"}
            </div>

            {/* 공유 선호 */}
            <div>{prettyShare(item.sharePreference)}</div>
          </div>
        </div>

        {/* 문의 입력 + Send 버튼 */}
        <div className="mt-8 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-3 text-sm"
              placeholder="문의 사항을 적어 주세요!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
            <button
              onClick={onSend}
              disabled={sending}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {sendErr ? (
            <div className="mt-2 text-sm text-red-600">{sendErr}</div>
          ) : sendOk ? (
            <div className="mt-2 text-sm text-green-700">Your request has been sent.</div>
          ) : null}

          {/* 안내문 */}
          <div className="pointer-events-none mt-4 select-none text-[11px] leading-5 text-gray-500">
            Only personal notes and self-created materials are permitted. Official course materials,
            exams, and assignment solutions are not allowed. All exchanges are conducted solely
            between users. The platform is not responsible for any transactions, content accuracy, or
            disputes.
          </div>
        </div>
      </div>
    </div>
  );
}



