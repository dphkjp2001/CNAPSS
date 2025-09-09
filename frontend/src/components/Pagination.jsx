// frontend/src/components/Pagination.jsx
import React, { useMemo } from "react";

function range(start, end) {
  const out = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Numeric pagination with ellipsis.
 *
 * Props:
 *  - page: number (1-based)
 *  - total: total item count
 *  - limit: items per page
 *  - onPageChange: (nextPage:number) => void
 *  - siblingCount: how many pages to show around current (default 1)
 *  - boundaryCount: how many pages to keep at the edges (default 1)
 *  - className: container className
 *  - scrollToTopOnChange: boolean (default true)
 *  - showStatus: show "Page X of Y" text (default true)
 */
export default function Pagination({
  page = 1,
  total = 0,
  limit = 20,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  className = "",
  scrollToTopOnChange = true,
  showStatus = true,
}) {
  const totalPages = Math.max(
    1,
    Math.ceil((Number(total) || 0) / Math.max(1, Number(limit)))
  );

  // ✅ 단일 페이지여도 항상 버튼 렌더 (Prev disabled, 1 active, Next disabled)
  const items = useMemo(() => {
    const startPages = range(1, Math.min(boundaryCount, totalPages));
    const endPages = range(
      Math.max(totalPages - boundaryCount + 1, boundaryCount + 1),
      totalPages
    );

    const leftSibling = Math.max(
      Math.min(page - siblingCount, totalPages - boundaryCount - siblingCount * 2 - 1),
      boundaryCount + 2
    );
    const rightSibling = Math.min(
      Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
      Math.max(totalPages - boundaryCount - 1, boundaryCount + 1)
    );

    const middlePages =
      totalPages <= boundaryCount * 2 + siblingCount * 2 + 3
        ? range(boundaryCount + 1, Math.max(boundaryCount, totalPages - boundaryCount))
        : range(leftSibling, rightSibling);

    const showLeftEllipsis = middlePages[0] > boundaryCount + 2;
    const showRightEllipsis =
      middlePages[middlePages.length - 1] < totalPages - boundaryCount - 1;

    const out = [];

    // left boundary
    startPages.forEach((p) => out.push({ type: "page", page: p }));
    if (showLeftEllipsis) out.push({ type: "ellipsis", key: "left" });

    // middle
    middlePages.forEach((p) => out.push({ type: "page", page: p }));

    // right boundary
    if (showRightEllipsis) out.push({ type: "ellipsis", key: "right" });
    endPages.forEach((p) => {
      if (!startPages.includes(p)) out.push({ type: "page", page: p });
    });

    // 단일 페이지면 out === [{type:'page', page:1}]
    return out;
  }, [page, totalPages, siblingCount, boundaryCount]);

  const baseBtn =
    "min-w-9 h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const activeBtn =
    "min-w-9 h-9 px-3 rounded-lg border border-gray-900 bg-gray-900 text-white text-sm font-semibold shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const iconBtn =
    "min-w-9 h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
  const disabled =
    "opacity-50 cursor-not-allowed hover:bg-white focus:ring-0 focus:outline-none";

  const handleGo = (p) => {
    if (!onPageChange) return;
    if (p === page) return;
    onPageChange(p);
    if (scrollToTopOnChange) {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
    }
  };

  return (
    <nav
      className={`mt-6 flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="Pagination"
    >
      {/* Prev */}
      <button
        type="button"
        className={`${iconBtn} ${page <= 1 ? disabled : ""}`}
        onClick={() => handleGo(Math.max(1, page - 1))}
        aria-label="Previous page"
        disabled={page <= 1}
      >
        ‹
      </button>

      {/* Pages */}
      {items.map((it, idx) =>
        it.type === "ellipsis" ? (
          <span
            key={`ellipsis-${it.key}-${idx}`}
            className="min-w-9 h-9 px-2 inline-flex items-center justify-center text-sm text-gray-400 select-none"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={`page-${it.page}`}
            type="button"
            className={it.page === page ? activeBtn : baseBtn}
            aria-current={it.page === page ? "page" : undefined}
            aria-label={`Go to page ${it.page}`}
            onClick={() => handleGo(it.page)}
          >
            {it.page}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        className={`${iconBtn} ${page >= totalPages ? disabled : ""}`}
        onClick={() => handleGo(Math.min(totalPages, page + 1))}
        aria-label="Next page"
        disabled={page >= totalPages}
      >
        ›
      </button>

      {/* status text */}
      {showStatus && (
        <span className="ml-2 inline-flex h-9 items-center text-sm text-gray-500">
          Page <strong className="mx-1 text-gray-900">{page}</strong> of{" "}
          <strong className="ml-1 text-gray-900">{totalPages}</strong>
        </span>
      )}
    </nav>
  );
}

