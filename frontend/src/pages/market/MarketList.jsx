// src/pages/market/MarketList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import axios from "axios";

const PAGE_SIZE = 12;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      <div className="aspect-[4/3] w-full rounded-t-2xl bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/5 rounded bg-gray-100" />
        <div className="h-4 w-2/5 rounded bg-gray-100" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

function EmptyState({ schoolPath }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
        🛒
      </div>
      <h3 className="text-lg font-semibold text-gray-800">No listings yet</h3>
      <p className="mt-1 text-sm text-gray-500">
        Be the first to create a listing. Items with photos and prices get more attention!
      </p>
      <Link
        to={schoolPath("/market/write")}
        className="mt-6 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-gray-900/30"
      >
        + Create Listing
      </Link>
    </div>
  );
}

function MarketCard({ item, schoolPath }) {
  const thumb = item?.images?.[0];
  return (
    <Link
      to={schoolPath(`/market/${item._id}`)}
      className="group block overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/20"
      aria-label={`${item.title} detail`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🖼️</div>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-gray-900">
          {item.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-gray-800">
          {currency.format(Number(item.price) || 0)}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{item.seller}</p>
        {item.location && (
          <div className="mt-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            {item.location}
          </div>
        )}
      </div>
    </Link>
  );
}

const MarketList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // "new" | "price-asc" | "price-desc"
  const [page, setPage] = useState(1);

  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const baseURL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    let mounted = true;
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${baseURL}/market`, { params: { school } }); // ✅ scoped
        if (mounted) setItems(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setErr("Failed to load listings.");
        console.error("❌ Failed to load listings", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchItems();
    return () => {
      mounted = false;
    };
  }, [baseURL, school]);

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => {
      if (!q) return true;
      return (
        it.title?.toLowerCase().includes(q) ||
        it.seller?.toLowerCase().includes(q)
      );
    });

    list = list.sort((a, b) => {
      if (sort === "price-asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sort === "price-desc") return (b.price ?? 0) - (a.price ?? 0);
      const ak = a.createdAt ?? a._id ?? "";
      const bk = b.createdAt ?? b._id ?? "";
      return String(bk).localeCompare(String(ak));
    });

    return list;
  }, [items, query, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme.bg }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Top bar */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: schoolTheme.text }}
          >
            Marketplace
          </h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: title, seller"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                aria-label="search items"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              aria-label="sort items"
            >
              <option value="new">Newest</option>
              <option value="price-asc">Lowest Price</option>
              <option value="price-desc">Highest Price</option>
            </select>

            <Link
              to={schoolPath("/messages")}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              💬 My Chats
            </Link>

            <Link
              to={schoolPath("/market/write")}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ backgroundColor: schoolTheme.primary }}
            >
              + Create Listing
            </Link>
          </div>
        </div>

        {/* Content */}
        {err && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : processed.length === 0 ? (
          <EmptyState schoolPath={schoolPath} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {paged.map((item) => (
                <MarketCard key={item._id} item={item} schoolPath={schoolPath} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MarketList;


