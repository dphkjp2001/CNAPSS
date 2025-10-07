// backend/models/Schedule.js
const mongoose = require("mongoose");

/** Slot shape:
 *  { day:"MON", start:"09:00", end:"10:15", label?:"CS-UY 1133", classNumber?:"12345" }
 */
const slotSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ["MON","TUE","WED","THU","FRI","SAT","SUN"], required: true },
    start: { type: String, match: /^\d{2}:\d{2}$/, required: true },
    end: { type: String, match: /^\d{2}:\d{2}$/, required: true },
    label: { type: String, trim: true },         // optional course code / title
    classNumber: { type: String, trim: true },   // optional section/CRN
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, enum: ["nyu","columbia","boston"] },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    semester: { type: String, required: true, trim: true }, // e.g. "2025-fall"
    slots: { type: [slotSchema], default: [] },
  },
  { timestamps: true }
);

scheduleSchema.index({ school: 1, userEmail: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Schedule", scheduleSchema);

