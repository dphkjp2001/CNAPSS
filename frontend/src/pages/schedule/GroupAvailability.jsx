import React, { useState } from "react";
import ScheduleGrid from "./ScheduleGrid";
import { useAuth } from "../../contexts/AuthContext"; // ✅ 변경됨

function generateTimeSlots() {
  const slots = [];
  for (let hour = 8; hour < 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }
  }
  return slots;
}

function GroupAvailability() {
  const { user } = useAuth(); // ✅ Firebase AuthContext에서 사용자 정보 가져옴
  const [userIds, setUserIds] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    const inputIds = userIds.split(",").map(id => id.trim()).filter(Boolean);
    const myId = user?.email || "anonymous"; // ✅ firebase/auth 제거 후 이메일 가져옴
    const finalIds = Array.from(new Set([myId, ...inputIds]));

    setLoading(true);
    try {
      const res = await fetch("/api/schedule/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: finalIds })
      });
      const data = await res.json();
      const schedules = data.schedules || [];

      const allTimeSlots = generateTimeSlots();
      const days = ["MON", "TUE", "WED", "THU", "FRI"];

      const availabilityMap = {};
      for (let day of days) {
        for (let time of allTimeSlots) {
          const key = `${day}_${time}`;
          availabilityMap[key] = 0;
        }
      }

      schedules.forEach((schedule) => {
        schedule.forEach(({ day, start, end }) => {
          const startIdx = allTimeSlots.indexOf(start);
          const endIdx = allTimeSlots.indexOf(end);
          for (let i = startIdx; i < endIdx; i++) {
            const key = `${day}_${allTimeSlots[i]}`;
            availabilityMap[key] += 1;
          }
        });
      });

      const result = [];
      for (let key in availabilityMap) {
        if (availabilityMap[key] === 0) {
          const [day, time] = key.split("_");
          result.push({ day, start: time, end: time, label: "✅" });
        }
      }

      setAvailableSlots(result);
    } catch (err) {
      console.error("Compare failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">Group Availability</h1>
      <p className="text-sm text-gray-500 mb-4">
        Enter comma-separated user IDs to find shared free times. (You are automatically included)
      </p>

      <div className="mb-4">
        <input
          type="text"
          placeholder="friend1@school.edu, friend2@school.edu"
          className="p-2 border rounded w-full mb-2 text-sm"
          value={userIds}
          onChange={(e) => setUserIds(e.target.value)}
        />
        <button
          onClick={handleCompare}
          className="px-4 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Checking..." : "Compare Schedules"}
        </button>
      </div>

      <ScheduleGrid schedules={availableSlots} />
    </div>
  );
}

export default GroupAvailability;

