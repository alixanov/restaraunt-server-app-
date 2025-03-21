const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const orderController = require("../controller/OrderController");
const workerController = require("../controller/workerController");
const workerValidation = require("../validation/WorkerValidation");
const tableController = require("../controller/tableController");
const tableValidation = require("../validation/TableValidation");
const foodController = require("../controller/foodController");
const foodValidation = require("../validation/FoodValidation");
const chefController = require("../controller/ChefController");

// Worker routes
router.get("/workers/all", workerController.getWorkers);
router.get("/workers/:id", workerController.getWorkerById);
router.post("/workers/create", workerValidation, workerController.createWorker);
router.post("/login", workerController.login);
router.delete("/workers/delete/:id", workerController.deleteWorker);
router.put("/workers/update/:id", workerController.updateWorker);
router.put("/workers/status/:id", workerController.changeStatus);

// Table routes
router.get("/tables/all", tableController.getTables);
router.get("/tables/:id", tableController.getTableById);
router.post("/tables/create", tableValidation, tableController.createTable);
router.delete("/tables/delete/:id", tableController.deleteTable);
router.put("/tables/update/:id", tableController.updateTable);
router.put("/tables/status/:id", tableController.changeTableStatus);

// Food routes
router.get("/foods/all", foodController.getFoods);
router.get("/foods/:id", foodController.getFoodById);
router.post("/foods/create", upload.single("image"), [foodValidation], foodController.createFood);
router.delete("/foods/delete/:id", foodController.deleteFood);
router.put("/foods/update/:id", foodController.updateFood);
router.put("/foods/status/:id", foodController.changeStatus);

// Order routes
router.post("/orders/create", orderController.createOrder);
router.post("/orders/close/:id", orderController.closeOrder);
router.get("/orders/table/:tableId", orderController.getOrdersByTable);
router.get("/orders/bill/:tableId", orderController.getBill);
router.get("/orders/open", orderController.getOpenOrders);
router.get("/orders/all", orderController.getAllOrders);
router.get("/sales/report", orderController.getSalesReport);

// Chef routes
router.put("/chef/dish/update", chefController.updateDishQuantity);
router.get("/chef/dishes", chefController.getAllDishes);

// Receipt printing endpointa
router.post("/print-receipt", async (req, res) => {
  try {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        state: false,
        message: "Невалидные данные для печати чека"
      });
    }

    await orderController.printReceipt(items, total);

    res.status(200).json({
      state: true,
      message: "Чек успешно отправлен на печать"
    });
  } catch (error) {
    console.error("Ошибка при обработке запроса на печать:", error);
    res.status(500).json({
      state: false,
      message: "Ошибка при печати чека",
      error: error.message
    });
  }
});

module.exports = router;