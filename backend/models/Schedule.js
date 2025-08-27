// const mongoose = require("mongoose");

// const ScheduleBlockSchema = new mongoose.Schema({
//   day: String,         // e.g., MON
//   start: String,       // e.g., "09:30"
//   end: String,         // e.g., "10:45"
//   label: String        // e.g., "CS-UY 1134"
// });

// const ScheduleSchema = new mongoose.Schema({
//   userId: String,                    // associated user id or email
//   blocks: [ScheduleBlockSchema],    // array of schedule blocks
// });

// module.exports = mongoose.model("Schedule", ScheduleSchema);




// backend/models/Schedule.js
const mongoose = require("mongoose");

/** Slot shape: { day: "MON"|"TUE"|"WED"|"THU"|"FRI"|"SAT"|"SUN", start: "HH:MM", end: "HH:MM" } */
const slotSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ["MON","TUE","WED","THU","FRI","SAT","SUN"], required: true },
    start: { type: String, match: /^\d{2}:\d{2}$/, required: true }, // 24h "09:30"
    end: { type: String, match: /^\d{2}:\d{2}$/, required: true },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, enum: ["nyu","columbia","boston"] },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    semester: { type: String, required: true, trim: true }, // e.g., "2025-fall"
    slots: { type: [slotSchema], default: [] },             // busy slots (수업/약속 등)
  },
  { timestamps: true } // createdAt, updatedAt
);

// 한 학기 단 한 개 문서만 유지 (업서트/교체)
scheduleSchema.index({ school: 1, userEmail: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Schedule", scheduleSchema);
