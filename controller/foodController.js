const response = require("../utils/response");
const foodModel = require("../model/FoodModel");
const sharp = require("sharp");
const axios = require("axios");
const FormData = require("form-data");

class FoodController {
  async getFoods(req, res) {
    try {
      const foods = await foodModel.find();
      if (!foods.length) return response.notFound(res, "Taomlar topilmadi");
      response.success(res, "Taomlar topildi", foods);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getFoodById(req, res) {
    try {
      const food = await foodModel.findById(req.params.id);
      if (!food) return response.notFound(res, "Taom topilmadi");
      response.success(res, "Taom topildi", food);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async createFood(req, res) {
    try {
      const data = JSON.parse(JSON.stringify(req.body));
      if (req.file) {
        const formData = new FormData();
        const processedImage = await sharp(req.file.buffer)
          .resize({ width: 150, height: 150, fit: "cover" })
          .jpeg({ quality: 90 })
          .toBuffer();

        formData.append("image", processedImage.toString("base64"));

        let api = `${process.env.IMGBB_URL}?key=${process.env.IMGBB_KEY}`;
        const response = await axios.post(api, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response?.data?.data?.url) {
          data.image = response.data.data.url;
        }
      }
      const food = await foodModel.create(data);
      if (!food) return response.error(res, "Taom qo'shilmadi");
      response.created(res, "Taom qo'shildi", food);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async updateFood(req, res) {
    try {
      const food = await foodModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!food) return response.error(res, "Taom yangilashda xatolik");
      response.success(res, "Taom yangilandi", food);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async deleteFood(req, res) {
    try {
      const food = await foodModel.findByIdAndDelete(req.params.id);
      if (!food) return response.error(res, "Taom o'chirilmadi");
      response.success(res, "Taom o'chirildi");
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getFoodsByCategory(req, res) {
    try {
      const foods = await foodModel.find({ category: req.params.category });
      if (!foods.length) return response.notFound(res, "Taomlar topilmadi");
      response.success(res, "Taomlar topildi", foods);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async changeStatus(req, res) {
    try {
      const food = await foodModel.findById(req.params.id);
      if (!food) return response.notFound(res, "Taom topilmadi");
      food.status = !food.status;
      await food.save();
      response.success(res, "Taom o'zgartirildi", food);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new FoodController();
