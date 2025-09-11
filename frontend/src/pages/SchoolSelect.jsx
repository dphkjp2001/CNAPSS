// frontend/src/pages/SchoolSelect.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../contexts/SchoolContext";

const ENABLED_SCHOOLS = new Set(["nyu"]);

const SCHOOLS = [
  {
    key: "nyu",
    name: "New York University",
    short: "NYU",
    tagline: "Violet vibes in the Village",
    image: "/nyu-bg.png", // make sure this exists in /public
  },
  {
    key: "columbia",
    name: "Columbia University",
    short: "Columbia",
    tagline: "Coming soon",
    image: "/columbia-bg.png", // placeholder for future
  },
  {
    key: "boston",
    name: "Boston University",
    short: "Boston",
    tagline: "Coming soon",
    image: "/boston-bg.png", // placeholder for future
  },
];

export default function SchoolSelect() {
  const nav = useNavigate();
  const { setSchool } = useSchool();
  const [selected, setSelected] = useState(null); // e.g., "nyu"

  const selectedInfo = useMemo(
    () => SCHOOLS.find((s) => s.key === selected) || null,
    [selected]
  );

  const isEnabled = (key) => ENABLED_SCHOOLS.has(String(key).toLowerCase());

  const handleEnter = () => {
    if (!selectedInfo) return;
    if (!isEnabled(selectedInfo.key)) {
      alert(`${selectedInfo.short} is coming soon 🚧`);
      return;
    }
    // persist selection then navigate
    setSchool(selectedInfo.key);
    nav(`/${encodeURIComponent(selectedInfo.key)}/dashboard`);
  };

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

      {/* Selection + Preview */}
      <section className="mx-auto max-w-6xl px-4 -mt-8 sm:-mt-10 pb-16">
        <div className="rounded-3xl border border-gray-100 bg-white shadow-xl/10 shadow-gray-200 p-4 sm:p-6 md:p-8">
          <h2 className="text-center text-xl font-semibold text-gray-900">
            Choose Your School
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-5">
            {/* School list */}
            <div className="md:col-span-2">
              <ul className="divide-y divide-gray-100 rounded-2xl border">
                {SCHOOLS.map((s) => {
                  const active = selected === s.key;
                  const enabled = isEnabled(s.key);
                  return (
                    <li key={s.key}>
                      <button
                        onClick={() => setSelected(s.key)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                          active
                            ? "bg-violet-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">
                            {s.name}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {enabled ? "Available" : "Coming soon"}
                          </div>
                        </div>
                        <span
                          className={`ml-3 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            enabled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {enabled ? "Active" : "Soon"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Tips */}
              <p className="mt-3 text-xs text-gray-500">
                You can browse as a guest. Sign up later to post or chat.
              </p>
            </div>

            {/* Preview panel */}
            <div className="md:col-span-3">
              <div className="relative overflow-hidden rounded-2xl border bg-white">
                {/* Empty state */}
                {!selectedInfo && (
                  <div className="flex aspect-[16/9] items-center justify-center text-sm text-gray-500">
                    Select a school to preview
                  </div>
                )}

                {/* Image preview */}
                {selectedInfo && (
                  <div className="relative aspect-[16/9]">
                    {/* background image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${selectedInfo.image}")`,
                        opacity: 0.22, // subtle transparency
                      }}
                    />
                    {/* gradient overlay for readability */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.75) 100%)",
                      }}
                    />

                    {/* content */}
                    <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 text-center">
                      <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {selectedInfo.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {selectedInfo.tagline}
                      </div>

                      <div className="mt-5">
                        <button
                          onClick={handleEnter}
                          className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow focus:outline-none focus:ring-2 ${
                            isEnabled(selectedInfo.key)
                              ? "bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-400"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                          }`}
                          disabled={!isEnabled(selectedInfo.key)}
                          title={
                            isEnabled(selectedInfo.key)
                              ? `Enter ${selectedInfo.short}`
                              : "Coming soon"
                          }
                        >
                          {isEnabled(selectedInfo.key) ? "Enter" : "Coming soon"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Helper text */}
              {selectedInfo && (
                <p className="mt-3 text-xs text-gray-500">
                  Preview image shown only on this page. Other pages keep their school theme colors.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



