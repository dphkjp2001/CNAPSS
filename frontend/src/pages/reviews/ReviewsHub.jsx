// frontend/src/pages/reviews/ReviewsHub.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";

export default function ReviewsHub() {
  const { school } = useSchool();
  const navigate = useNavigate();
  const [profQuery, setProfQuery] = useState("");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Reviews</h1>
      <p className="text-sm text-gray-600 mb-6">
        Compare professors for a course, read/write reviews, and check overall signals. (Boards are separate.)
      </p>

      <div className="grid gap-4">
        {/* Browse by course */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-medium">Browse by Course</div>
              <p className="text-sm text-gray-600">
                Pick a course first, then compare professors and read recent reviews.
              </p>
            </div>
            <button
              className="px-4 py-2 rounded-lg border bg-black text-white"
              onClick={() => navigate(`/${school}/courses`, { state: { intent: "REVIEW" } })}
            >
              Open Course Hub
            </button>
          </div>
        </div>

        {/* Jump to professor */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="text-lg font-medium mb-2">Jump to a Professor</div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Type professor name or paste professorId…"
              value={profQuery}
              onChange={(e) => setProfQuery(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
              onClick={() => {
                const q = profQuery.trim();
                if (!q) return;
                const objectIdRe = /^[a-f0-9]{24}$/i;
                if (objectIdRe.test(q)) {
                  navigate(`/${school}/professors/${q}`);
                } else {
                  navigate(`/${school}/courses`, { state: { intent: "FIND_PROFESSOR", query: q } });
                }
              }}
            >
              Go
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Tip: You can search professors inside the Course Hub by course, section, or name.
          </p>
        </div>
      </div>
    </div>
  );
}


