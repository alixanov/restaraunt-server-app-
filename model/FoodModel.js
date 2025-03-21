const mongoose = require("mongoose");

const DishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Taom nomi (Kabob, Lag‘mon)
    category: {
      type: String,
      enum: ["food", "shashlik", "salat", "drink", "desert", "other"], // "shashlik" qo‘shildi
      required: true,
    }, // Kategoriya
    price: { type: Number, required: true }, // Narxi (so'm)
    image: { type: String }, // Taom rasmi
    statusInMenu: { type: Boolean, default: true }, // Holati (Menyuda yoki yo‘q)
    quantity: { type: Number, required: true }, // Miqdori (kg, dona, litr)
  },
  { timestamps: true }
);

const Dish = mongoose.model("Dish", DishSchema);
module.exports = Dish;
