const response = require("../utils/response");
const OrderModel = require("../model/OrderModel");
const TableModel = require("../model/tableModel");
const DishModel = require("../model/FoodModel");
const WorkerModel = require("../model/workersModel");
const escpos = require("escpos");
escpos.Network = require("escpos-network");

class OrderController {
  constructor() {
    this.PRINTERS = {
      food: {
        ip: process.env.PRINTER_FOOD_IP,
        port: process.env.PRINTER_FOOD_PORT,
      },
      shashlik: {
        ip: process.env.PRINTER_SHASHLIK_IP,
        port: process.env.PRINTER_SHASHLIK_PORT,
      },
      salat: {
        ip: process.env.PRINTER_SALAT_IP,
        port: process.env.PRINTER_SALAT_PORT,
      },
      drink: {
        ip: process.env.PRINTER_DRINK_IP,
        port: process.env.PRINTER_DRINK_PORT,
      },
      desert: {
        ip: process.env.PRINTER_DESERT_IP,
        port: process.env.PRINTER_DESERT_PORT,
      },
      other: {
        ip: process.env.PRINTER_OTHER_IP,
        port: process.env.PRINTER_OTHER_PORT,
      },
    };
  }

  isShashlik(dishName) {
    const shashlikKeywords = ["shashlik", "kabob", "kebab"];
    return shashlikKeywords.some((keyword) =>
      dishName.toLowerCase().includes(keyword)
    );
  }

  // Oldingi metodlar o‘zgarmagan holda qoladi: printOrderToPrinter, createOrder, closeOrder, getBill, getOrdersByTable, getOpenOrders, getSalesReport

  printOrderToPrinter = async (order, table, dishDetails, category) => {
    try {
      const printerConfig = this.PRINTERS[category];
      if (!printerConfig || !printerConfig.ip) {
        throw new Error(`Kategoriya uchun printer sozlanmagan: ${category}`);
      }

      const device = new escpos.Network(printerConfig.ip, printerConfig.port);
      const printer = new escpos.Printer(device);

      const connectWithRetry = (maxRetries = 3, retryDelay = 2000) => {
        return new Promise((resolve, reject) => {
          let retries = 0;
          const attemptConnect = () => {
            device.open((error) => {
              if (!error) resolve();
              else {
                retries++;
                if (retries < maxRetries) {
                  console.warn(
                    `Printerga ulanishda xato (${retries}/${maxRetries})...`
                  );
                  setTimeout(attemptConnect, retryDelay);
                } else {
                  reject(
                    new Error(`Printerga ulanib bo‘lmadi: ${error.message}`)
                  );
                }
              }
            });
          };
          attemptConnect();
        });
      };

      await connectWithRetry();

      const worker = await WorkerModel.findById(order.worker);
      if (!worker) throw new Error("Ofitsiant topilmadi");

      printer
        .font("a")
        .align("ct")
        .style("bu")
        .size(1, 1)
        .text("Buyurtma")
        .text("---------------")
        .align("lt")
        .text(`Stol raqami: ${table.number}`)
        .text(`Ofitsiant: ${worker.fullname}`)
        .text("Taomlar:");

      dishDetails.forEach((item) => {
        let unit = item.category === "drink" ? "litr" : "dona";
        printer.text(`${item.quantity}x ${item.name} (${unit})`);
      });

      printer.text("---------------").align("ct").cut().close();
    } catch (err) {
      console.error(`Chop etishda xato (${category}):`, err.message);
      throw new Error(`Printer bilan muammo (${category}): ${err.message}`);
    }
  };
  createOrder = async (req, res) => {
    try {
      let io = req.app.get("socket");
      if (!io) return response.serverError(res, "Socket.io yo'q");

      const { tableId, foods, workerId } = req.body;

      const worker = await WorkerModel.findById(workerId);
      if (!worker) return response.notFound(res, "Ishchi topilmadi");
      if (worker.role !== "waiter") {
        return response.error(
          res,
          "Faqat ofitsiantlar buyurtma qabul qila oladi"
        );
      }

      let table = await TableModel.findById(tableId);
      if (!table) return response.notFound(res, "Stol topilmadi");

      if (table.workerId && table.workerId.toString() !== workerId) {
        const assignedWorker = await WorkerModel.findById(table.workerId);
        return response.error(
          res,
          `Bu stolga ${assignedWorker.fullname} ofitsiant mas'ul, siz buyurtma qila olmaysiz`
        );
      }

      let totalPrice = 0;
      const dishDetails = [];

      for (let item of foods) {
        let dish = await DishModel.findById(item.food);
        if (!dish) return response.notFound(res, "Taom topilmadi");

        if (dish.quantity < item.quantity) {
          return response.error(
            res,
            `${dish.name} uchun yetarli qoldiq yo‘q. Qoldiq: ${dish.quantity}`
          );
        }

        totalPrice += dish.price * item.quantity;
        dishDetails.push({
          name: dish.name,
          quantity: item.quantity,
          price: dish.price,
          category: dish.category,
        });

        dish.quantity -= item.quantity;
        await dish.save();
      }

      const order = await OrderModel.create({
        table: tableId,
        worker: workerId,
        foods,
        totalPrice,
      });

      table.isActive = true;
      table.workerId = workerId;
      await table.save();

      const categorizedDishes = {};
      dishDetails.forEach((item) => {
        let printCategory = item.category;
        if (item.category === "food" && this.isShashlik(item.name)) {
          printCategory = "shashlik";
        }
        if (!categorizedDishes[printCategory]) {
          categorizedDishes[printCategory] = [];
        }
        categorizedDishes[printCategory].push(item);
      });

      for (const category in categorizedDishes) {
        await this.printOrderToPrinter(
          order,
          table,
          categorizedDishes[category],
          category
        );
      }

      io.emit("new_order", { ...order.toJSON(), workerId });
      io.emit("admin_new_order", {
        order: { ...order.toJSON(), workerId },
        table: table.number,
      });
      io.emit("table_status", { tableId, isActive: true, workerId });
      console.log(`Событие table_status отправлено: tableId=${tableId}, isActive=true, workerId=${workerId}`);

      response.created(res, "Buyurtma yaratildi", order);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };
  





  // Adding printReceipt function to OrderController
  printReceipt = async (items, total) => {
    try {
      const printerIp = process.env.PRINTER_TOTAL_IP || '192.168.1.49';
      const printerPort = parseInt(process.env.PRINTER_TOTAL_PORT) || 9100;
      const device = new escpos.Network(printerIp, printerPort);
      const printer = new escpos.Printer(device);

      // Aggregate items to combine duplicates
      const aggregatedItems = items.reduce((acc, item) => {
        const existing = acc.find(i => i.food._id.toString() === item.food._id.toString());
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          acc.push({ food: item.food, quantity: item.quantity });
        }
        return acc;
      }, []);

      // Minimal and creative receipt design for ASH13
      let receipt = '\n';
      receipt += new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) + '\n';
      receipt += '-------------------------------\n'; // Minimal separator

      // Print aggregated items with space after each
      receipt += 'Buyurtmalar\n';
      aggregatedItems.forEach((item, index) => {
        const name = item.food.name.slice(0, 10).padEnd(10, ' ');
        const qty = item.quantity.toString().padStart(2, ' ');
        const amount = (item.food.price * item.quantity).toLocaleString();
        receipt += `> ${name}${qty} ${amount}UZS`; // No extra newline here
        if (index < aggregatedItems.length - 1) receipt += '\n\n'; // Add space after each item except last
      });

      receipt += '\n-------------------------------\n'; // Minimal separator
      receipt += `Umumiy hisob ${total.toLocaleString()}UZS\n`;
      receipt += '\n-------------------------------\n'; // Minimal separator
      receipt += 'Tanlov uchun rahmat\n'; // Creative thank-you
      receipt += '\n\n\n\n'; // Добавляем 2 пустые строки для отступа ~10px


      // Asynchronous printing with styling
      return new Promise((resolve, reject) => {
        device.open((err) => {
          if (err) {
            console.error('Printer connection error:', err);
            return reject(new Error(`Connection error: ${err.message}`));
          }

          printer
            .font('b') // Smaller font
            .align('ct') // Center alignment for header
            .style('bu') // Bold underline for header
            .text('Restorant - ASH13\n') // Bold restaurant name
            .style('normal')
            .align('lt') // Left align for items
            .text(receipt) // Print receipt
            .cut() // Full paper cut
            .close(() => {
              console.log('Receipt printed successfully for order with total:', total);
              resolve();
            }, (err) => {
              console.error('Error during printing:', err);
              reject(new Error(`Print error: ${err.message}`));
            });
        });
      });
    } catch (error) {
      console.error('Error in printReceipt:', error);
      throw error;
    }
  };


 // Updated closeOrder to ensure table status is updated
closeOrder = async (req, res) => {
  try {
    let io = req.app.get("socket");
    if (!io) return response.serverError(res, "Socket.io not available");

    const orderId = req.params.id;
    const workerId = req.body.workerId;

    const worker = await WorkerModel.findById(workerId);
    if (!worker) return response.notFound(res, "Worker not found");
    if (worker.role !== "admin" && worker.role !== "waiter") {
      return response.error(res, "Only admin or waiter can close an order");
    }

    let order = await OrderModel.findById(orderId)
      .populate("table")
      .populate("foods.food");
    if (!order) return response.notFound(res, "Order not found");
    if (order.status !== "open") {
      return response.error(res, "Order is already closed or canceled");
    }

    order.status = "closed";
    await order.save();

    const openOrders = await OrderModel.find({
      table: order.table._id,
      status: "open",
    });
    if (openOrders.length === 0) {
      order.table.isActive = false;
      order.table.workerId = null; // Сбрасываем workerId
      await order.table.save();
      io.emit("table_status", {
        tableId: order.table._id,
        isActive: false,
        workerId: null,
      });
      console.log(`Статус стола ${order.table._id} обновлён на сервере`);
    }

    // Use only the current order's items for the receipt
    const items = order.foods.map((f) => ({ food: f.food, quantity: f.quantity }));
    const total = order.totalPrice;

    console.log(`Attempting to print receipt for order ${orderId} with total ${total}`);
    await this.printReceipt(items, total);

    io.emit("order_closed", order);
    response.success(res, "Order closed", order);
  } catch (err) {
    response.serverError(res, err.message, err);
  }
};

  // New endpoint to print a single receipt for all closed orders
  printAllReceipts = async (req, res) => {
    try {
      const { tableId, items, total } = req.body;
      console.log(`Printing single receipt for table ${tableId} with total ${total}`);

      const printerIp = process.env.PRINTER_TOTAL_IP || '192.168.1.49';
      const printerPort = parseInt(process.env.PRINTER_TOTAL_PORT) || 9100;
      const device = new escpos.Network(printerIp, printerPort);
      const printer = new escpos.Printer(device);

      // Minimal and creative receipt design for ASH13
      let receipt = '\n';
      receipt += new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) + '\n';
      receipt += '-------------------------------\n'; // Minimal separator

      // Print aggregated items with space after each
      receipt += 'Buyurtmalar\n';
      items.forEach((item, index) => {
        const name = item.food.name.slice(0, 10).padEnd(10, ' ');
        const qty = item.quantity.toString().padStart(2, ' ');
        const amount = (item.food.price * item.quantity).toLocaleString();
        receipt += `> ${name}${qty} ${amount}UZS`; // No extra newline here
        if (index < items.length - 1) receipt += '\n\n'; // Add space after each item except last
      });

      receipt += '\n-------------------------------\n'; // Minimal separator
      receipt += `Umumiy hisob ${total.toLocaleString()}UZS\n`;
      receipt += 'Tanlov uchun rahmat\n'; // Creative thank-you

      // Asynchronous printing with styling
      await new Promise((resolve, reject) => {
        device.open((err) => {
          if (err) {
            console.error('Printer connection error:', err);
            return reject(new Error(`Connection error: ${err.message}`));
          }

          printer
            .font('b') // Smaller font
            .align('ct') // Center alignment for header
            .style('bu') // Bold underline for header
            .text('Restorant - ASH13\n') // Bold restaurant name
            .style('normal')
            .align('lt') // Left align for items
            .text(receipt) // Print receipt
            .cut() // Full paper cut
            .close(() => {
              console.log('Single receipt printed successfully for table:', tableId);
              resolve();
            }, (err) => {
              console.error('Error during printing:', err);
              reject(new Error(`Print error: ${err.message}`));
            });
        });
      });

      res.success(res, "Receipt printed successfully");
    } catch (error) {
      console.error('Error in printAllReceipts:', error);
      res.serverError(res, error.message, error);
    }
  };









  

  getBill = async (req, res) => {
    try {
      let io = req.app.get("socket");
      if (!io) return response.serverError(res, "Socket.io yo'q");

      const tableId = req.params.tableId;
      const workerId = req.query.workerId;

      const worker = await WorkerModel.findById(workerId);
      if (!worker) return response.notFound(res, "Ishchi topilmadi");
      if (worker.role !== "admin") {
        return response.error(res, "Faqat admin hisobni yopa oladi");
      }

      const orders = await OrderModel.find({
        table: tableId,
        status: "open",
      }).populate("foods.food");
      if (!orders.length)
        return response.notFound(res, "Ochiq buyurtmalar topilmadi");

      let totalBill = 0;
      orders.forEach((order) => {
        totalBill += order.totalPrice;
      });

      await OrderModel.updateMany(
        { table: tableId, status: "open" },
        { status: "closed" }
      );

      let table = await TableModel.findById(tableId);
      table.isActive = false;
      await table.save();

      io.emit("table_status", { tableId, isActive: false });
      io.emit("bill_generated", { tableId, totalBill, orders });

      response.success(res, "Hisob tayyor", { tableId, totalBill, orders });
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };

  getOrdersByTable = async (req, res) => {
    try {
      const tableId = req.params.tableId;
      const workerId = req.query.workerId; // Ofitsiant ID sini so‘rov bilan qabul qilamiz

      const worker = await WorkerModel.findById(workerId);
      if (!worker) return response.notFound(res, "Ishchi topilmadi");
      if (worker.role !== "waiter") {
        return response.error(
          res,
          "Faqat ofitsiantlar buyurtmalarni ko‘ra oladi"
        );
      }

      const orders = await OrderModel.find({ table: tableId, status: "open" })
        .populate("table")
        .populate("worker")
        .populate("foods.food");

      if (!orders.length)
        return response.notFound(
          res,
          "Ushbu stol uchun ochiq buyurtmalar topilmadi"
        );

      // Faqat o‘sha ofitsiantning buyurtmalarini tekshirish
      const isAuthorized = orders.every(
        (order) => order.worker._id.toString() === workerId
      );
      if (!isAuthorized) {
        return response.error(
          res,
          "Bu stolga boshqa ofitsiant buyurtma bergan, siz kira olmaysiz"
        );
      }

      response.success(res, "Buyurtmalar topildi", orders);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };

  getOpenOrders = async (req, res) => {
    try {
      const orders = await OrderModel.find({ status: "open" })
        .populate("table")
        .populate("worker")
        .populate("foods.food");
      if (!orders.length)
        return response.notFound(res, "Ochiq buyurtmalar topilmadi");
      response.success(res, "Ochiq buyurtmalar", orders);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };

  // Yangi funksiya: Barcha buyurtmalarni olish
  getAllOrders = async (req, res) => {
    try {
      const orders = await OrderModel.find()
        .populate("table")
        .populate("worker")
        .populate("foods.food");

      if (!orders.length) {
        return response.notFound(res, "Hech qanday buyurtma topilmadi");
      }

      response.success(res, "Barcha buyurtmalar", orders);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  };


  

 getSalesReport = async (req, res) => {
    try {
      const orders = await OrderModel.find({ status: "closed" })
        .populate("foods.food")
        .populate("worker")
        .populate("table");

      if (!orders.length) {
        return res.status(404).json({
          state: false,
          message: "Yopilgan buyurtmalar topilmadi"
        });
      }

      let totalRevenue = 0;
      const salesByFood = {};
      const tableReport = {};
      const workerReport = {};

      // Расчет общей выручки и продаж по блюдам
      orders.forEach((order) => {
        totalRevenue += order.totalPrice;

        // Продажи по блюдам
        order.foods.forEach((item) => {
          const foodId = item.food._id.toString();
          if (!salesByFood[foodId]) {
            salesByFood[foodId] = {
              name: item.food.name,
              category: item.food.category,
              sold: 0,
              revenue: 0,
              remainingQuantity: item.food.quantity,
            };
          }
          salesByFood[foodId].sold += item.quantity;
          salesByFood[foodId].revenue += item.quantity * item.food.price;
        });

        // Отчет по столам
        const tableId = order.table._id.toString();
        if (!tableReport[tableId]) {
          tableReport[tableId] = {
            number: order.table.number,
            revenue: 0,
            isActive: order.table.isActive,
          };
        }
        tableReport[tableId].revenue += order.totalPrice;

        // Отчет по официантам
        const workerId = order.worker._id.toString();
        if (!workerReport[workerId]) {
          workerReport[workerId] = {
            fullname: order.worker.fullname,
            ordersCount: 0,
            revenue: 0,
            workerId: workerId // Добавляем ID для идентификации
          };
        }
        workerReport[workerId].ordersCount += 1;
        workerReport[workerId].revenue += order.totalPrice;
      });

      const tables = await TableModel.find();

      const report = {
        state: true,
        message: "Umumiy hisobot",
        innerData: {
          totalRevenue,
          foodSales: Object.values(salesByFood),
          tableReport: Object.values(tableReport),
          workerReport: Object.values(workerReport),
          tableStats: {
            totalTables: tables.length,
            activeTables: tables.filter((t) => t.isActive).length,
            inactiveTables: tables.filter((t) => !t.isActive).length,
          },
        },
      };

      res.status(200).json(report);
    } catch (err) {
      res.status(500).json({
        state: false,
        message: err.message,
        error: err
      });
    }
  };
}
module.exports = new OrderController();
