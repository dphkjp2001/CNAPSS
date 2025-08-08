//src/pages/schedule/MySchedule.jsx
import React, { useState, useEffect } from "react";
import ScheduleGrid from "./ScheduleGrid";
import CourseSearch from "./CourseSearch";

function parseMeeting(meetStr) {
  const dayMap = {
    M: "MON",
    T: "TUE",
    W: "WED",
    R: "THU",
    F: "FRI",
  };

  const regex = /([MTWRF]+) (\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?([ap])/i;
  const match = meetStr.match(regex);
  if (!match) return [];

  const days = match[1].split("").map((d) => dayMap[d]);
  const startHour = parseInt(match[2]);
  const startMin = parseInt(match[3] || "0");
  const endHour = parseInt(match[4]);
  const endMin = parseInt(match[5] || "0");
  const meridiem = match[6].toLowerCase();

  const start = `${startHour + (meridiem === "p" && startHour < 12 ? 12 : 0)}:${startMin
    .toString()
    .padStart(2, "0")}`;
  const end = `${endHour + (meridiem === "p" && endHour < 12 ? 12 : 0)}:${endMin
    .toString()
    .padStart(2, "0")}`;

  return days.map((day) => ({ day, start, end }));
}

function PersonalSchedule() {
  const [courseList, setCourseList] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetch("/NYU_course_DATA.json")
      .then((res) => res.json())
      .then((data) => setCourseList(data))
      .catch((err) => console.error("Failed to load course data:", err));
  }, []);

  const handleAddCourse = (section) => {
    const isAlreadyAdded = selected.some(
      (s) => s.label === section.course_code && s.class_number === section.class_number
    );
  
    if (isAlreadyAdded) {
      // 제거
      setSelected((prev) =>
        prev.filter((s) => s.class_number !== section.class_number)
      );
    } else {
      // 추가
      const slots = parseMeeting(section.meets).map((s) => ({
        ...s,
        label: section.course_code,
        class_number: section.class_number, // ✅ 비교 위해 포함
      }));
      setSelected((prev) => [...prev, ...slots]);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Personal Schedule Builder</h1>

      <div className="flex gap-6">
        {/* 좌측: 검색창 */}
        <div className="w-3/12">
          <CourseSearch data={courseList} onSelect={handleAddCourse} />
        </div>

        {/* 우측: 스케줄 그리드 */}
        <div className="w-9/12">
          <ScheduleGrid schedules={selected} />
        </div>
      </div>
    </div>
  );
}

export default PersonalSchedule;


