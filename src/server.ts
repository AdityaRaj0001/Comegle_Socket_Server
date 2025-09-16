import http from "http";
import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";
import { RoomManager } from "./managers/RoomManager";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

const userManager = new UserManager();

// ✅ helper function at the top level
export const updateUserCount = () => {
  const count = userManager.getUserCount();
  io.emit("user-count", { count });
};

io.on("connection", (socket: Socket) => {
  console.log("a user connected");

  socket.on("register-name", ({ user }) => {
    // console.log("Registering user:", user);
    userManager.addUser(user, socket); // Add user with real name now
  });

  //skip-kra h user ne I mean exit nhi kra h user ne
  socket.on("leave-room", ({ roomId }) => {
    userManager.leaveRoom(roomId, socket.id);
  });

  socket.on("exit", ({ roomId }) => {
    userManager.exitLobby(socket.id, roomId);
    updateUserCount();
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.disconnectedFromLobby(socket.id);
    updateUserCount();
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Signalling server running on port ${PORT}`);
});
