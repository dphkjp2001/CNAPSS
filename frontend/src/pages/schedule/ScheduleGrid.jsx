import React from "react";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const START_HOUR = 8;
const END_HOUR = 20;
const INTERVAL_MINUTES = 15;

function generateTimeSlots() {
  const slots = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let min = 0; min < 60; min += INTERVAL_MINUTES) {
      slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }
  }
  return slots;
}

function timeToIndex(time) {
  const [hour, minute] = time.split(":").map(Number);
  return (hour - START_HOUR) * (60 / INTERVAL_MINUTES) + Math.floor(minute / INTERVAL_MINUTES);
}

function ScheduleGrid({ schedules = [] }) {
  const timeSlots = generateTimeSlots();

  const getDayIndex = (day) => DAYS.indexOf(day);

  return (
    <div className="relative overflow-x-auto">
      <div
        className="grid border border-gray-200"
        style={{
          gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)`,
          gridTemplateRows: `repeat(${timeSlots.length}, 1fr)`,
          position: "relative"
        }}
      >
        {/* 헤더 */}
        <div className="bg-gray-100 p-1 text-sm font-semibold">Time</div>
        {DAYS.map((day) => (
          <div key={day} className="bg-gray-100 p-1 text-sm font-semibold text-center">
            {day}
          </div>
        ))}

        {/* 시간 라벨 */}
        {timeSlots.map((time, i) => (
            <React.Fragment key={time}>
                {/* 시간 라벨: 1시간 단위만 표시 */}
                <div className="text-xs text-right pr-2 border-r border-gray-200 p-1">
                {time.endsWith(":00") ? time : ""}
                </div>
                {DAYS.map((_, col) => (
                <div key={`${col}-${time}`} className="border border-gray-100" />
                ))}
            </React.Fragment>
        ))}


        {/* 수업 블록 */}
        {schedules.map((slot, index) => {
          const col = getDayIndex(slot.day) + 2; // +2 because grid starts with Time + 1-based index
          const startRow = timeToIndex(slot.start) + 2;
          const endRow = timeToIndex(slot.end) + 2;

          return (
            <div
              key={`${slot.day}-${slot.start}-${slot.class_number}-${index}`}
              style={{
                gridColumn: col,
                gridRow: `${startRow} / ${endRow}`,
              }}
              className="bg-blue-600 text-white text-xs rounded shadow-sm p-1 flex items-start justify-start cursor-pointer"
            >
              {slot.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScheduleGrid;















