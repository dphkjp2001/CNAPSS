import React, { useMemo } from "react";
import { useSchool } from "../contexts/SchoolContext";

/**
 * Semi-transparent page background for a specific school.
 *
 * Example:
 *  <SchoolBackground schoolKey="nyu" imageUrl="/nyu-bg.png" opacity={0.18} />
 *
 * Notes:
 *  - Put your image in /frontend/public (e.g., /nyu-bg.png)
 *  - Renders only when current school === schoolKey
 *  - Sits ABOVE parent background color (z-0) but BELOW content (content uses z-10)
 *  - Does not block interactions (pointer-events-none)
 */
export default function SchoolBackground({
  schoolKey = "nyu",
  imageUrl = "/nyu-bg.png",
  opacity = 0.18,   // 살짝 올려서 더 보이도록
  gradient = true,
  blur = false,
  className = "",
}) {
  const { school } = useSchool();
  const isTarget = useMemo(
    () => String(school || "").trim().toLowerCase() === String(schoolKey).toLowerCase(),
    [school, schoolKey]
  );

  if (!isTarget) return null;

  return (
    // z-0 로 부모 배경색 위로 올림 (예: bg-white, 보라 배경 등)
    <div className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      {/* Background image */}
      <div
        className={`absolute inset-0 bg-center bg-no-repeat bg-cover ${blur ? "backdrop-blur-sm" : ""}`}
        style={{ backgroundImage: `url("${imageUrl}")`, opacity }}
      />

      {/* 약한 그라데이션 (가독성 확보용) */}
      {gradient && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.6) 100%)",
          }}
        />
      )}
    </div>
  );
}

