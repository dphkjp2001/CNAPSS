import React, { useState, useMemo } from "react";

function CourseSearch({ data, onSelect }) {
  const [query, setQuery] = useState("");

  // 🔍 normalize: 대소문자, 공백, 하이픈 제거
  const normalize = (str) => str.toLowerCase().replace(/[\s\-]/g, "");

  const filteredSections = useMemo(() => {
    if (!query || !Array.isArray(data)) return [];

    return data
      .flatMap((course) =>
        Array.isArray(course.sections)
          ? course.sections.map((section) => ({
              course_code: course.course_code,
              course_title: course.course_title,
              section_number: section.section_number,
              class_number: section.class_number,
              meets: section.meets,
            }))
          : []
      )
      .filter(
        (section) =>
          normalize(section.course_code).includes(normalize(query)) ||
          normalize(section.course_title).includes(normalize(query))
      )
      .slice(0, 100);
  }, [query, data]);

  return (
    <div className="mb-4">
      <input
        type="text"
        className="w-full p-2 border rounded text-sm"
        placeholder="Search courses by code or title..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      <div className="space-y-2 max-h-72 overflow-y-auto mt-2">
        {filteredSections.length > 0 ? (
          filteredSections.map((item) => (
            <div
              key={item.class_number}
              onClick={() => onSelect(item)}
              className="border p-2 rounded bg-white shadow-sm cursor-pointer hover:bg-blue-50 transition"
            >
              <div className="text-sm font-medium">
                {item.course_code} - {item.course_title}
              </div>
              <div className="text-xs ml-2 text-gray-700">
                Section {item.section_number}: {item.meets}
              </div>
            </div>
          ))
        ) : (
          query && (
            <div className="text-sm text-gray-500 p-4">
              No matching courses found.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default CourseSearch;










