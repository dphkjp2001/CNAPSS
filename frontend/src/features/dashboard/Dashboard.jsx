import React from "react";
import { useParams, useSearchParams, Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import BoardFeed from "../board/BoardFeed.jsx";
import PostDetail from "../board/PostDetail.jsx";
import PostComposer from "../board/PostComposer.jsx";

const DEFAULTS = { board: "academic", type: "general", sort: "latest" };

// Top quick filters (Airbnb-ish minimal)
function BoardFilters({ board, type, sort, onChange }) {
  return (
    <div className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-full border ${board === "free" ? "bg-gray-900 text-white" : "bg-white"}`}
          onClick={() => onChange({ board: "free", type: "general" })}
        >
          Freeboard
        </button>
        <button
          className={`px-3 py-1.5 rounded-full border ${board === "academic" ? "bg-gray-900 text-white" : "bg-white"}`}
          onClick={() => onChange({ board: "academic" })}
        >
          Academic
        </button>
        {board === "academic" && (
          <div className="ml-3 flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-full border ${type === "general" ? "bg-gray-800 text-white" : "bg-white"}`}
              onClick={() => onChange({ type: "general" })}
            >
              General Q
            </button>
            <button
              className={`px-3 py-1.5 rounded-full border ${type === "looking" ? "bg-gray-800 text-white" : "bg-white"}`}
              onClick={() => onChange({ type: "looking" })}
            >
              Looking For
            </button>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-full border ${sort === "latest" ? "bg-gray-100" : "bg-white"}`}
            onClick={() => onChange({ sort: "latest" })}
          >
            Latest
          </button>
          <button
            className={`px-3 py-1.5 rounded-full border ${sort === "top" ? "bg-gray-100" : "bg-white"}`}
            onClick={() => onChange({ sort: "top" })}
          >
            Top
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { school } = useParams();
  const [params, setParams] = useSearchParams();
  const board = params.get("board") || DEFAULTS.board;
  const type  = params.get("type")  || DEFAULTS.type;
  const sort  = params.get("sort")  || DEFAULTS.sort;
  const navigate = useNavigate();
  const location = useLocation();

  const onChange = (next) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => merged.set(k, v));
    setParams(merged, { replace: false });
  };

  const onOpenDetail = (postId) => {
    navigate(`/` + [school, "dashboard", "post", postId].join("/") + `?${params.toString()}`);
  };

  const onCloseDetail = () => {
    navigate(`/${school}/dashboard?${params.toString()}`, { replace: true });
  };

  return (
    <div>
      <BoardFilters board={board} type={type} sort={sort} onChange={onChange} />
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
        {/* Feed */}
        <div className="lg:col-span-2">
          <BoardFeed board={board} type={type} sort={sort} onOpenDetail={onOpenDetail} />
        </div>
        {/* Composer */}
        <aside className="lg:col-span-1">
          <PostComposer board={board} type={type} />
          <div className="mt-4 text-sm text-gray-500">
            Anonymous policy: author <b>anonymous</b>, comments show <b>anonymous(OP)</b> or <b>anonymous1..</b>
          </div>
        </aside>
      </div>

      {/* Drawer-like detail (route-based) */}
      <Routes>
        <Route
          path="post/:postId"
          element={
            <PostDetail onClose={onCloseDetail} />
          }
        />
      </Routes>
    </div>
  );
}
