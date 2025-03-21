require("dotenv").config();
const express = require("express");
const { connect } = require("mongoose");
const cors = require("cors");

const notfound = require("./middleware/notfound.middleware");
const router = require("./routes/router");
const authMiddleware = require("./middleware/AuthMiddleware");

const { createServer } = require("node:http");
const soket = require("./socket");
const app = express();
const server = createServer(app);
const io = require("./middleware/socket.header")(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "https://restaraunt-client-app.vercel.app"],
  // origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

app.use(cors(corsOptions));

(async () => {
  await connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDBga ulanish muvaffaqiyatli! ✅✅✅"))
    .catch((err) => console.log("MongoDB ulanish xatosi:,🛑🛑🛑", err));
})();

app.set("socket", io);
soket.connect(io);
app.use(
  "/api",
  // authMiddleware,
  router
);
app.get("/", (req, res) => res.send("Salom dunyo"));
app.use(notfound);


const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server http://192.168.1.7:${PORT} da ishlamoqda`);
});