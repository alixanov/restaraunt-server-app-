const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    login: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "chef", "waiter"],
      required: true,
    },
    salary: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
