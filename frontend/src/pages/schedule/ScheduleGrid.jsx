// import React from "react";
// const pastelColors = [
//   "bg-red-200",
//   "bg-yellow-200",
//   "bg-green-200",
//   "bg-blue-200",
//   "bg-indigo-200",
//   "bg-purple-200",
//   "bg-pink-200",
//   "bg-orange-200",
//   "bg-teal-200",
// ];

// const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
// const START_HOUR = 8;
// const END_HOUR = 21; // 20:45까지 포함
// const INTERVAL_MINUTES = 15;

// function generateTimeSlots() {
//   const slots = [];
//   for (let hour = START_HOUR; hour < END_HOUR; hour++) {
//     for (let min = 0; min < 60; min += INTERVAL_MINUTES) {
//       slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
//     }
//   }
//   return slots;
// }

// function timeToIndex(time) {
//   const [hour, minute] = time.split(":").map(Number);
//   return (hour - START_HOUR) * (60 / INTERVAL_MINUTES) + Math.floor(minute / INTERVAL_MINUTES);
// }

// function ScheduleGrid({ schedules, onRemove }) {
//   const timeSlots = generateTimeSlots();
//   const getDayIndex = (day) => DAYS.indexOf(day);
//   const getColorByLabel = (label) => {
//     let hash = 0;
//     for (let i = 0; i < label.length; i++) {
//       hash = label.charCodeAt(i) + ((hash << 5) - hash);
//     }
//     const index = Math.abs(hash) % pastelColors.length;
//     return pastelColors[index];
//   };

//   return (
//     <div className="relative overflow-x-auto">
//       <div
//         className="grid border border-gray-200"
//         style={{
//           gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)`,
//           gridTemplateRows: `40px repeat(${timeSlots.length}, 1fr)`,
//         }}
//       >
//         {/* Header row */}
//         <div style={{ gridColumn: 1 }} className="bg-gray-100 p-1 text-sm font-semibold text-center">Time</div>
//         {DAYS.map((day, i) => (
//           <div
//             key={day}
//             style={{ gridColumn: i + 2 }}
//             className="bg-gray-100 p-1 text-sm font-semibold text-center border-l border-gray-200"
//           >
//             {day}
//           </div>
//         ))}

//         {timeSlots.map((time, idx) => (
//           <div
//             key={`time-${idx}`}
//             style={{
//               gridColumn: 1,
//               gridRow: idx + 2,
//               borderTop: time.endsWith(":00") ? "1px solid #666" : "1px solid #e5e7eb", // ✅ 위쪽 선으로 변경
//               borderRight: "1px solid #e5e7eb",
//             }}
//             className={`text-xs text-right pr-2 pt-[2px] ${
//               time.endsWith(":00") ? "font-medium text-gray-800" : "text-gray-400"
//             }`}
//           >
//             {time.endsWith(":00") ? time : ""}
//           </div>
//         ))}


//         {/* Empty grid cells */}
//        {timeSlots.map((time, rowIdx) =>
//           DAYS.map((_, dayIdx) => (
//             <div
//               key={`cell-${dayIdx}-${rowIdx}`}
//               style={{
//                 gridColumn: dayIdx + 2,
//                 gridRow: rowIdx + 2,
//                 borderTop: time.endsWith(":00") ? "1px solid #666" : "1px solid #e5e7eb", // ✅ 수정
//                 borderLeft: "1px solid #f3f4f6",
//               }}
//             />
//           ))
//         )}


//         {/* Class blocks */}
//         {schedules.map((slot, index) => {
//           const col = getDayIndex(slot.day) + 2;
//           const startRow = timeToIndex(slot.start) + 2;
//           const endRow = timeToIndex(slot.end) + 2;

//           return (
//             <div
//               key={`${slot.day}-${slot.start}-${slot.class_number}-${index}`}
//               style={{
//                 gridColumn: col,
//                 gridRow: `${startRow} / ${endRow}`,
//                 margin: "1px",
//               }}
//               className={`${getColorByLabel(slot.label)} text-black text-xs rounded shadow-sm p-1 flex items-start justify-start`}
//               title={slot.label}
//               onDoubleClick={() => onRemove(slot.class_number)}
//             >
//               {slot.label}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// export default ScheduleGrid;


// src/pages/schedule/ScheduleGrid.jsx
import React from "react";
const pastelColors = [
  "bg-red-200",
  "bg-yellow-200",
  "bg-green-200",
  "bg-blue-200",
  "bg-indigo-200",
  "bg-purple-200",
  "bg-pink-200",
  "bg-orange-200",
  "bg-teal-200",
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const START_HOUR = 8;
const END_HOUR = 21; // 20:45까지 포함
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

function ScheduleGrid({ schedules, onRemove }) {
  const timeSlots = generateTimeSlots();
  const getDayIndex = (day) => DAYS.indexOf(day);
  const getColorByLabel = (label) => {
    const str = label || "";
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % pastelColors.length;
    return pastelColors[index];
  };

  return (
    <div className="relative overflow-x-auto">
      <div
        className="grid border border-gray-200"
        style={{
          gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)`,
          gridTemplateRows: `40px repeat(${timeSlots.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div style={{ gridColumn: 1 }} className="bg-gray-100 p-1 text-center text-sm font-semibold">
          Time
        </div>
        {DAYS.map((day, i) => (
          <div
            key={day}
            style={{ gridColumn: i + 2 }}
            className="border-l border-gray-200 bg-gray-100 p-1 text-center text-sm font-semibold"
          >
            {day}
          </div>
        ))}

        {/* Time labels */}
        {timeSlots.map((time, idx) => (
          <div
            key={`time-${idx}`}
            style={{
              gridColumn: 1,
              gridRow: idx + 2,
              borderTop: time.endsWith(":00") ? "1px solid #666" : "1px solid #e5e7eb",
              borderRight: "1px solid #e5e7eb",
            }}
            className={`pr-2 pt-[2px] text-right text-xs ${
              time.endsWith(":00") ? "font-medium text-gray-800" : "text-gray-400"
            }`}
          >
            {time.endsWith(":00") ? time : ""}
          </div>
        ))}

        {/* Empty cells */}
        {timeSlots.map((time, rowIdx) =>
          DAYS.map((_, dayIdx) => (
            <div
              key={`cell-${dayIdx}-${rowIdx}`}
              style={{
                gridColumn: dayIdx + 2,
                gridRow: rowIdx + 2,
                borderTop: time.endsWith(":00") ? "1px solid #666" : "1px solid #e5e7eb",
                borderLeft: "1px solid #f3f4f6",
              }}
            />
          ))
        )}

        {/* Blocks */}
        {schedules.map((slot, index) => {
          const col = getDayIndex(slot.day) + 2;
          const startRow = timeToIndex(slot.start) + 2;
          const endRow = timeToIndex(slot.end) + 2;

          return (
            <div
              key={`${slot.day}-${slot.start}-${slot.class_number || index}`}
              style={{ gridColumn: col, gridRow: `${startRow} / ${endRow}`, margin: "1px" }}
              className={`${getColorByLabel(slot.label)} flex items-start justify-start rounded p-1 text-xs text-black shadow-sm`}
              title={`${slot.label || ""} ${slot.start}-${slot.end}`}
              onDoubleClick={() => onRemove && slot.class_number && onRemove(slot.class_number)}
            >
              {slot.label || ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScheduleGrid;
















