import React from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timeSlots = [];

for (let hour = 8; hour < 20; hour++) {
  const hh = String(hour).padStart(2, "0");
  timeSlots.push(`${hh}:00`);
}

function ScheduleGrid({ selectedCourses = [], availabilityMap = {} }) {
  const timeToIndex = (time) => {
    const [h] = time.split(":").map(Number);
    return h - 8;
  };

  const isCellSelected = (day, time) => {
    return selectedCourses.some((course) => {
      if (!course.days.includes(day)) return false;
      const startIdx = timeToIndex(course.startTime);
      const endIdx = timeToIndex(course.endTime);
      const cellIdx = timeToIndex(time);
      return cellIdx >= startIdx && cellIdx < endIdx;
    });
  };

  const isCellAvailable = (day, time) => {
    const key = `${day}-${time}`;
    return availabilityMap[key];
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-fixed border-collapse border border-gray-300 bg-white">
        <thead>
          <tr>
            <th className="w-20 border border-gray-300 bg-gray-100"></th>
            {days.map((day) => (
              <th key={day} className="w-24 border border-gray-300 bg-gray-100">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time) => (
            <tr key={time}>
              <td className="text-[12px] text-right pr-1 border border-gray-300 bg-gray-50">
                {time}
              </td>
              {days.map((day) => {
                const isSelected = isCellSelected(day, time);
                const isAvailable = isCellAvailable(day, time);

                let cellClass = "bg-white";
                if (isSelected) cellClass = "bg-blue-400 text-white";
                else if (isAvailable) cellClass = "bg-green-300";

                return (
                  <td
                    key={`${day}-${time}`}
                    className={`h-[42px] border border-gray-300 text-center text-[11px] transition ${cellClass}`}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScheduleGrid;




