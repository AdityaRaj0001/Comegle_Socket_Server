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
    // 👤 Register a new general user (enters general lobby)
    userManager.addUser(user, socket);
  });

  socket.on("register-name-topic", ({ user, topic }) => {
    // 👤 Register a new topic user (enters topic lobby)
    userManager.addTopicUser(user, socket, topic);
  });

  /**
   * ⚠️ Just leaving the room, not the lobby
   * - User stays in users array and stays queued
   * - So user count should NOT change
   */
  socket.on("leave-room", ({ roomId }) => {
    userManager.leaveRoom(roomId, socket.id);
  });

  /**
   * ✅ Fully exiting the general lobby
   * - Remove from arrays, queues, userIndex
   * - So user count MUST be updated
   */
  socket.on("exit", ({ roomId }) => {
    userManager.exitLobby(socket.id, roomId);
    updateUserCount();
  });

  /**
   * ⚠️ Just leaving the room, not the topic lobby
   * - User stays in topicUsers array and topic queue
   * - So user count should NOT change
   */
  socket.on("leave-topic-room", ({ topic, roomId }) => {
    userManager.leaveTopicRoom(socket.id, topic, roomId);
  });

  /**
   * ✅ Fully exiting the topic lobby
   * - Remove from topic arrays, topic queues, userIndex
   * - So user count MUST be updated
   */
  socket.on("exit-topic", ({ topic, roomId }) => {
    userManager.exitTopicLobby(socket.id, topic, roomId);
    updateUserCount();
  });

  /**
   * ✅ Disconnection = forced exit from lobby
   * - Remove from all structures and userIndex
   * - So user count MUST be updated
   */
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
