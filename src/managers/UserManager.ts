import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User{
  name:string;
  college:string;
  gender:string;
  socket:Socket;
}

export class UserManager {
  private users: User[];
  private queue: string[];
  private roomManager: RoomManager;

  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  // getUserBySocketId(socketId: string): User | null {
  //   return this.users.find((user) => user.socket.id === socketId) || null;
  // }

  addUser(user: User, socket: Socket) {
    this.users.push({
      ...user,
      socket,
    });
    this.queue.push(socket.id);
    socket.emit("lobby");
    this.clearQueue();
    this.initHandlers(socket);
  }

  //print Users
  printUsers() {
    if (this.users.length === 0) {
      console.log("No users connected.");
      return;
    }

    console.log("Connected Users:");
    this.users.forEach((user) => {
      console.log(`Name: ${user.name}, Socket ID: ${user.socket.id}`);
    });
  }

  setUserName(socketId: string, name: string) {
    const user = this.users.find((u) => u.socket.id === socketId);
    if (user) user.name = name;
  }

  removeUser(socketId: string) {
    const user = this.users.find((x) => x.socket.id === socketId);
    this.users = this.users.filter((x) => x.socket.id !== socketId);
    this.queue = this.queue.filter((x) => x === socketId);
  }

  exitLobby(socketId: string): void {
    const user = this.users.find((u) => u.socket.id === socketId);
    if (!user) return;

    // Remove from queue if in queue i.e he is in the lobby
    this.queue = this.queue.filter((id) => id !== socketId);

    // If in a room, remove room, notify peer, requeue peer
    const foundRoom = this.roomManager.getRoomBySocketId(socketId);
    if (foundRoom) {
      const {
        roomId,
        room: { user1, user2 },
      } = foundRoom;

      const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
        foundRoom.room,
        socketId
      );

      if (!peerSocket) return;

      // Notify the peer
      peerSocket.emit("peer-disconnected");

      // Remove room
      this.roomManager.removeRoom(roomId);

      // Requeue the peer efficiently
      this.queue.push(peerSocket.id);
      this.clearQueue();
    }

    console.log(`User ${socketId} exited lobby.`);
  }

  clearQueue() {
    console.log("inside clear queues");
    if (this.queue.length < 2) {
      return;
    }

    const id1 = this.queue.pop();
    const id2 = this.queue.pop();

    const user1 = this.users.find((x) => x.socket.id === id1);
    const user2 = this.users.find((x) => x.socket.id === id2);

    if (!user1 || !user2) {
      return;
    }
    console.log("creating room");

    const room = this.roomManager.createRoom(user1, user2, this.users);
    this.clearQueue();
  }

  leaveRoom(socketId: string): void {
    const foundRoom = this.roomManager.getRoomBySocketId(socketId);
    if (!foundRoom) return;

    const {
      roomId,
      room: { user1, user2 },
    } = foundRoom;

    const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
      foundRoom.room,
      socketId
    );
    if (!peerSocket) return;
    // Emit peer-disconnected to the other user
    peerSocket.emit("peer-disconnected");

    // Remove the room and user
    this.roomManager.removeRoom(roomId);
    // this.removeUser(socketId);
    // Push peerSocket.id to the start of the queue, socketId to the end
    this.queue.unshift(peerSocket.id);
    this.queue.push(socketId);
    this.clearQueue();
    console.log(`User ${socketId} left. Room ${roomId} deleted.`);
  }

  initHandlers(socket: Socket) {
    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
      this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
    });


    socket.on("toggle-video", ({ enabled }) => {
      const peerSocket = this.roomManager.getPeerSocketBySocketId(socket.id);
      if (!peerSocket) return;
      peerSocket.emit("peer-video-toggled", { enabled });
    });

    socket.on("toggle-audio", ({ enabled }) => {
      const peerSocket = this.roomManager.getPeerSocketBySocketId(socket.id);
      if (!peerSocket) return;
      peerSocket.emit("peer-audio-toggled", { enabled });
    });

    // -- Add this chat handler inside UserManager.initHandlers(socket) --

socket.on("chat-message", ({ roomId, message }) => {
  // Find the room
  const foundRoom = this.roomManager.getRoomBySocketId(socket.id);
  if (!foundRoom) return;

  // Find sender and peer
  const sender = foundRoom.room.user1.socket.id === socket.id ? foundRoom.room.user1 : foundRoom.room.user2;
  const peer = foundRoom.room.user1.socket.id === socket.id ? foundRoom.room.user2 : foundRoom.room.user1;

  // Relay the chat message to the peer
  peer.socket.emit("chat-message", {
    senderName: sender.name,
    senderId: sender.socket.id,
    message,
    timestamp: Date.now(),
  });
});
  }
}
