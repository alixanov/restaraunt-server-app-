const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Mahsulot nomi (Gazli suv, Kabob, Olivye)
  category: {
    type: String,
    required: true,
    // enum: ["ovqat", "salat", "ichimlik", "sok", "boshqa"],
  },
  supplier: { type: String, required: true }, // Kim olib kelgan?
  quantity: { type: Number, required: true }, // Miqdori (kg, dona, litr)
  unit: { type: String, enum: ["kg", "litr", "dona"], required: true }, // O‘lchov birligi
  price: { type: Number, required: true }, // Narxi (so'm)
  receivedAt: { type: Date, default: Date.now }, // Kelgan sana
  status: { type: String, enum: ["omborda", "iste'molda"], default: "omborda" }, // Holati
});

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
