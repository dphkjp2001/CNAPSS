//src/pages/schedule/MySchedule.jsx
import React, { useState, useEffect } from "react";
import ScheduleGrid from "./ScheduleGrid";
import CourseSearch from "./CourseSearch";

// PersonalSchedule.jsx 내부
function parseMeeting(meetingStr, label, class_number) {
  if (!meetingStr) return [];

  // ✅ am/pm이 하나만 있어도 동작하게
  const regex = /([MTWRF]+)\s(\d{1,2})(?::(\d{2}))?(a|p)?-(\d{1,2})(?::(\d{2}))?(a|p)/i;
  const match = meetingStr.match(regex);
  if (!match) return [];

  const dayStr = match[1];

  const startHour = parseInt(match[2]);
  const startMin = parseInt(match[3] || "0");
  const startMeridiemRaw = match[4];
  const endHourRaw = parseInt(match[5]);
  const endMin = parseInt(match[6] || "0");
  const endMeridiem = match[7].toLowerCase();

  // ✅ startMeridiem이 없으면 endMeridiem을 따름
  const startMeridiem = (startMeridiemRaw || endMeridiem).toLowerCase();

  const startHour24 = startHour % 12 + (startMeridiem === "p" ? 12 : 0);
  const endHour24 = endHourRaw % 12 + (endMeridiem === "p" ? 12 : 0);

  const start = `${startHour24.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;
  const end = `${endHour24.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

  const dayMap = { M: "MON", T: "TUE", W: "WED", R: "THU", F: "FRI" };

  return dayStr.split("").map((d) => ({
    day: dayMap[d],
    start,
    end,
    label,
    class_number,
  }));
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
      setSelected((prev) =>
        prev.filter((s) => s.class_number !== section.class_number)
      );
    } else {
      const slots = parseMeeting(
        section.meets,
        section.course_code,
        section.class_number
      );

       const isConflict = slots.some((newSlot) =>
        selected.some(
          (existing) =>
            existing.day === newSlot.day &&
            !(
              newSlot.end <= existing.start || // 새 수업이 기존 수업 전
              newSlot.start >= existing.end    // 새 수업이 기존 수업 후
            )
        )
      );

      if (isConflict) {
        const confirmReplace = window.confirm("선택한 과목이 기존 수업과 시간이 겹칩니다. 기존 과목을 이 과목으로 바꾸시겠습니까?");
        if (!confirmReplace) return;

        // 겹치는 수업을 삭제
        const conflictClassNumbers = slots
          .flatMap((newSlot) =>
            selected.filter(
              (existing) =>
                existing.day === newSlot.day &&
                !(
                  newSlot.end <= existing.start ||
                  newSlot.start >= existing.end
                )
            )
          )
          .map((s) => s.class_number);

        const filtered = selected.filter(
          (s) => !conflictClassNumbers.includes(s.class_number)
        );

        setSelected([...filtered, ...slots]);
        return;
      }

      setSelected((prev) => [...prev, ...slots]);
    }
};
  const handleRemoveCourse = (class_number) => {
  setSelected((prev) =>
    prev.filter((s) => s.class_number !== class_number)
  );
};


  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Personal Schedule Builder</h1>

      <div className="flex gap-6">
        <div className="w-3/12">
          <CourseSearch data={courseList} onSelect={handleAddCourse} />
        </div>

        <div className="w-9/12">
          <ScheduleGrid schedules={selected} onRemove={handleRemoveCourse} />
        </div>
      </div>
    </div>
  );
}

export default PersonalSchedule;


