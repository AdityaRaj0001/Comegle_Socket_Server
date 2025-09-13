import http from "http";
import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

const userManager = new UserManager();

io.on("connection", (socket: Socket) => {
  console.log("a user connected");
  userManager.addUser("randomName", socket);
  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Signalling server running on port ${PORT}`);
});
