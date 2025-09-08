// frontend/src/pages/SchoolSelect.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const ENABLED_SCHOOLS = new Set(["nyu"]);

export default function SchoolSelect() {
  const nav = useNavigate();
  const go = (slug) => {
    if (!ENABLED_SCHOOLS.has(slug)) {
      const label = slug === "columbia" ? "Columbia" : slug === "boston" ? "Boston" : slug;
      alert(`${label} is coming soon 🚧`);
      return;
    }
    nav(`/${encodeURIComponent(slug)}/dashboard`);
  };

  const disabledBtn =
    "rounded-full bg-gray-300 text-gray-600 px-5 py-2.5 text-sm font-semibold cursor-not-allowed opacity-70";

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900">
            CNAPSS
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-gray-600">
            Share smarter. Meet faster. Campus life, organized.
          </p>
        </div>
      </section>

      {/* Selection Card */}
      <section className="mx-auto max-w-3xl px-4 -mt-8 sm:-mt-10 pb-16">
        <div className="rounded-3xl border border-gray-100 bg-white shadow-xl/10 shadow-gray-200 p-8 sm:p-10">
          <h2 className="text-center text-xl font-semibold text-gray-900">
            Choose Your School
          </h2>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {/* ✅ Active */}
            <button
              onClick={() => go("nyu")}
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              NYU
            </button>

            {/* ⛔️ Coming soon (disabled look + alert) */}
            <button
              onClick={() => go("columbia")}
              aria-disabled
              className={disabledBtn}
              title="Coming soon"
            >
              Columbia
            </button>
            <button
              onClick={() => go("boston")}
              aria-disabled
              className={disabledBtn}
              title="Coming soon"
            >
              Boston
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            You can browse as a guest. Sign up later to post or chat.
          </p>
        </div>
      </section>
    </div>
  );
}


