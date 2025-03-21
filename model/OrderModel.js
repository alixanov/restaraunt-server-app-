// model/OrderModel.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    foods: [
      {
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dish",
          required: true,
        },
        quantity: { type: Number, required: true, default: 1 },
      },
    ],
    status: {
      type: String,
      enum: ["open", "closed", "cancelled"],
      default: "open",
    },
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TotalPrice ni avtomatik hisoblash
OrderSchema.pre("save", async function (next) {
  if (this.isModified("foods")) {
    const FoodModel = require("./FoodModel"); // Dinamik import
    let total = 0;
    for (let item of this.foods) {
      const food = await FoodModel.findById(item.food);
      if (food) total += food.price * item.quantity;
    }
    this.totalPrice = total;
  }
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
