const response = require("../utils/response");
const DishModel = require("../model/FoodModel");
const WorkerModel = require("../model/workersModel");
const jwt = require("jsonwebtoken");

class ChefController {
  updateDishQuantity = async (req, res) => {
    try {
      const { dishId, quantity } = req.body;
      const token = req.headers.authorization?.split(" ")[1]; // "Bearer token" formatida

      if (!token) return response.error(res, "Token topilmadi");

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const workerId = decoded.id;

      const worker = await WorkerModel.findById(workerId);
      if (!worker) return response.notFound(res, "Ishchi topilmadi");
      if (worker.role !== "chef") {
        return response.error(
          res,
          "Faqat oshpazlar taom qoldig‘ini o‘zgartira oladi"
        );
      }

      const dish = await DishModel.findById(dishId);
      if (!dish) return response.notFound(res, "Taom topilmadi");

      dish.quantity = quantity;
      await dish.save();

      const io = req.app.get("socket");
      if (io) {
        io.emit("dish_quantity_updated", { dishId, quantity });
      }

      response.success(res, "Taom qoldig‘i yangilandi", dish);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };

  getAllDishes = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return response.error(res, "Token topilmadi");

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const workerId = decoded.id;

      const worker = await WorkerModel.findById(workerId);
      if (!worker) return response.notFound(res, "Ishchi topilmadi");
      if (worker.role !== "chef") {
        return response.error(res, "Faqat oshpazlar taomlarni ko‘ra oladi");
      }

      const dishes = await DishModel.find();
      response.success(res, "Barcha taomlar", dishes);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };
}

module.exports = new ChefController();
