import http from "http";
import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";
import { RoomManager } from "./managers/RoomManager";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

const userManager = new UserManager();

io.on("connection", (socket: Socket) => {
  console.log("a user connected");

  socket.on("register-name", ({ name }) => {
    userManager.addUser(name, socket); // Add user with real name now
  });

  socket.on("leave-room", () => {
    userManager.leaveRoom(socket.id);
  });

  socket.on("exit", () => {
    userManager.exitLobby(socket.id);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id); // 🧹 Clean up user
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Signalling server running on port ${PORT}`);
});
