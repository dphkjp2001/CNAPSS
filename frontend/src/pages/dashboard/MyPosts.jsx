// frontend/src/pages/dashboard/MyPosts.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { listMyPosts, deletePost } from "../../api/posts";
import {
  listMyAcademicPosts,
  deleteAcademicPost,
} from "../../api/academicPosts";
import { Link, useLocation } from "react-router-dom";

function pluckArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  return [];
}

export default function MyPosts() {
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const location = useLocation();

  const [freePosts, setFreePosts] = useState([]);
  const [academicPosts, setAcademicPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const meId = String(user?._id || user?.id || "");

  // 🟦 자유게시판 글 불러오기 (백엔드에 /posts/my 존재)
  const fetchFreePosts = useCallback(async () => {
    try {
      const data = await listMyPosts({ school });
      // 서버가 Post 모델(자유/아카데믹 혼합)을 쓰는 환경일 수 있으니,
      // 혹시 학술(board==='academic')이 섞여 오면 free만 남기기
      const onlyFree =
        Array.isArray(data) ? data.filter((p) => (p.board || "free") === "free") : [];
      setFreePosts(onlyFree);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load Free Board posts.");
    }
  }, [school]);

  // 🟥 아카데믹 게시판 글 불러오기 (백엔드 mine 미지원 → 프론트 필터)
  const fetchAcademicPosts = useCallback(async () => {
    try {
      const res = await listMyAcademicPosts({ school, limit: 200, sort: "new" });
      const all = pluckArray(res);
      // author가 ObjectId로 오므로 문자열 비교
      const mine = all.filter((p) => String(p.author) === meId);
      setAcademicPosts(mine);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load Academic Board posts.");
    }
  }, [school, meId]);

  // 초기/경로 변경시 둘 다 불러오기
  const fetchAll = useCallback(async () => {
    if (!school) return;
    setLoading(true);
    await Promise.allSettled([fetchFreePosts(), fetchAcademicPosts()]);
    setLoading(false);
  }, [school, fetchFreePosts, fetchAcademicPosts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, location.pathname]);

  // 게시글 삭제 핸들러
  const handleDelete = async (id, type) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      if (type === "free") {
        await deletePost({ school, id });
        await fetchFreePosts();
      } else if (type === "academic") {
        await deleteAcademicPost({ school, id });
        await fetchAcademicPosts();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete post.");
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">📝 My Posts</h2>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-600">
            Loading…
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : (
          <>
            {/* 자유게시판 섹션 */}
            <section className="mb-10">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                🗣 Free Board Posts
              </h3>
              {freePosts.length === 0 ? (
                <p className="text-gray-600 text-sm">
                  You haven’t written any Free Board posts yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {freePosts.map((post) => (
                    <li
                      key={post._id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex-1">
                        <Link
                          to={schoolPath(`/freeboard/${post._id}`)}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {post.title}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(post._id, "free")}
                        className="ml-4 shrink-0 rounded-lg bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 아카데믹 게시판 섹션 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                🎓 Academic Board Posts
              </h3>
              {academicPosts.length === 0 ? (
                <p className="text-gray-600 text-sm">
                  You haven’t written any Academic Board posts yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {academicPosts.map((post) => (
                    <li
                      key={post._id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex-1">
                        <Link
                          to={schoolPath(`/academic/${post._id}`)}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {post.title}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(post._id, "academic")}
                        className="ml-4 shrink-0 rounded-lg bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

