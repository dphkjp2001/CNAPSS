const mongoose = require("mongoose");

const ScheduleBlockSchema = new mongoose.Schema({
  day: String,         // e.g., MON
  start: String,       // e.g., "09:30"
  end: String,         // e.g., "10:45"
  label: String        // e.g., "CS-UY 1134"
});

const ScheduleSchema = new mongoose.Schema({
  userId: String,                    // associated user id or email
  blocks: [ScheduleBlockSchema],    // array of schedule blocks
});

module.exports = mongoose.model("Schedule", ScheduleSchema);
