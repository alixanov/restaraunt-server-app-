const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker",
    default: null,
  },
});

module.exports = mongoose.model("Table", tableSchema);