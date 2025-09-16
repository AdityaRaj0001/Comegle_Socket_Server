import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";
import { updateUserCount } from "../server";
export interface User {
  name: string;
  college: string;
  gender: string;
  collegeState: string; // from frontend
  preferences: {
    states: string[]; // e.g. ["Delhi", "UP"] or ["*"] for all
    preferredGender: string[]; // e.g. ["male"], ["female"], or both
  };
  socket: Socket;
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

  //make a function to return the length of users array
  getUserCount(): number {
    return this.users.length - 1;
  }

  private findMatch(user: User): User | null {
    for (const queuedId of this.queue) {
      const candidate = this.users.find((u) => u.socket.id === queuedId);
      if (!candidate) continue;

      // --- Matching conditions ---
      const stateMatch =
        user.preferences.states.includes("*") ||
        candidate.preferences.states.includes("*") ||
        user.preferences.states.includes(candidate.collegeState) ||
        candidate.preferences.states.includes(user.collegeState);

      const genderMatch =
        (user.preferences.preferredGender.includes("any") ||
          user.preferences.preferredGender.includes(candidate.gender)) &&
        (candidate.preferences.preferredGender.includes("any") ||
          candidate.preferences.preferredGender.includes(user.gender));

      if (stateMatch && genderMatch) {
        return candidate;
      }
    }
    console.log("No match found for user:", user.name);
    return null;
  }

  addUser(user: User, socket: Socket) {
    const newUser: User = { ...user, socket };
    const { name, college, gender, collegeState, preferences } = user;
    console.log("New user added:", {
      name,
      college,
      gender,
      collegeState,
      preferences,
      socketId: socket.id,
    });
    this.users.push(newUser);
    updateUserCount();
    // Try to find a match from the queue
    const match = this.findMatch(newUser);
    socket.emit("lobby");

    if (match) {
      // Remove match from queue
      this.queue = this.queue.filter((id) => id !== match.socket.id);

      // Create room immediately
      this.roomManager.createRoom(newUser, match, this.users);
      console.log(`Room created between ${newUser.name} and ${match.name}`);
    } else {
      // No match found, keep in queue
      this.queue.push(socket.id);
      console.log(`User ${newUser.name} added to queue.`);
    }

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

  removeUserFromUsersArrayAndQueue(socketId: string) {
    this.users = this.users.filter((x) => x.socket.id !== socketId);
    this.queue = this.queue.filter((x) => x !== socketId);
  }

  clearQueue() {
    if (this.queue.length < 2) return;

    // Try to match remaining users in queue
    const queueCopy = [...this.queue];
    this.queue = [];

    for (const id of queueCopy) {
      const user = this.users.find((u) => u.socket.id === id);
      if (!user) continue;

      const match = this.findMatch(user);
      if (match) {
        this.queue = this.queue.filter((x) => x !== match.socket.id);
        this.roomManager.createRoom(user, match, this.users);
      } else {
        this.queue.push(id); // still waiting
      }
    }
  }

  leaveRoom(roomId: string, socketId: string): void {
    const foundRoom = this.roomManager.getRoomByRoomId(roomId);
    if (!foundRoom) return;

    const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
      foundRoom,
      socketId
    );
    if (!peerSocket) return;
    // Emit peer-disconnected to the other user
    peerSocket.emit("peer-disconnected");

    // Remove the room
    this.roomManager.removeRoom(roomId);

    // Push peerSocket.id to the start of the queue, socketId to the end
    this.queue.unshift(peerSocket.id);
    this.queue.push(socketId);
    this.clearQueue();
    console.log(`User ${socketId} left. Room ${roomId} deleted.`);
  }

  exitLobby(socketId: string, roomId: string): void {
    const user = this.users.find((u) => u.socket.id === socketId);
    if (!user) return;

    this.removeUserFromUsersArrayAndQueue(socketId);
    // If in a room, remove room, notify peer, requeue peer
    const foundRoom = this.roomManager.getRoomByRoomId(roomId);
    if (foundRoom) {
      const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
        foundRoom,
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

  //when user disconnects from the lobby maybe by closing the browser or the tab then this runs
  disconnectedFromLobby(socketId: string): void {
    const user = this.users.find((u) => u.socket.id === socketId);
    if (!user) return;

    this.removeUserFromUsersArrayAndQueue(socketId);
    // If in a room, remove room, notify peer, requeue peer
    const foundRoom = this.roomManager.getRoomBySocketId(socketId);
    if (foundRoom) {
      const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
        foundRoom.room,
        socketId
      );

      if (!peerSocket) return;

      // Notify the peer
      peerSocket.emit("peer-disconnected");

      // Remove room
      this.roomManager.removeRoom(foundRoom.roomId);

      // Requeue the peer efficiently
      this.queue.push(peerSocket.id);
      this.clearQueue();
    }

    console.log(`User ${socketId} exited lobby.`);
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

    socket.on("toggle-video", ({ enabled, roomId }) => {
      const foundRoom = this.roomManager.getRoomByRoomId(roomId);
      if (!foundRoom) return;

      const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
        foundRoom,
        socket.id
      );
      if (!peerSocket) return;
      if (!peerSocket) return;
      peerSocket.emit("peer-video-toggled", { enabled });
    });

    socket.on("toggle-audio", ({ enabled, roomId }) => {
      const foundRoom = this.roomManager.getRoomByRoomId(roomId);
      if (!foundRoom) return;

      const peerSocket = this.roomManager.getPeerSocketFromRoomBySocketId(
        foundRoom,
        socket.id
      );
      if (!peerSocket) return;
      peerSocket.emit("peer-audio-toggled", { enabled });
    });

    // -- Add this chat handler inside UserManager.initHandlers(socket) --

    socket.on("chat-message", ({ roomId, message }) => {
      // Find the room
      const foundRoom = this.roomManager.getRoomByRoomId(roomId);
      console.log(
        "Chat message received in room:",
        roomId,
        "Message:",
        message
      );
      if (!foundRoom) return;

      // Find sender and peer
      const sender =
        foundRoom.user1.socket.id === socket.id
          ? foundRoom.user1
          : foundRoom.user2;
      const peer =
        foundRoom.user1.socket.id === socket.id
          ? foundRoom.user2
          : foundRoom.user1;

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
