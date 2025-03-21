const io = require("socket.io-client");
const socket = io("http://localhost:3000", {
  transports: ["websocket"],
});

class SocketService {
  // get users
  async getUsers(params) {
    return new Promise(async (resolve, reject) => {});
  }
}

module.exports = new SocketService();
