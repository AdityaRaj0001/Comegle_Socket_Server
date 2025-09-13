import { Socket } from "socket.io";
import { User } from "./UserManager";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room>;
  constructor() {
    this.rooms = new Map<string, Room>();
  }

  printAllRooms() {
    if (this.rooms.size === 0) {
      console.log("No active rooms.");
      return;
    }

    console.log("All Rooms:");
    for (const [roomId, room] of this.rooms.entries()) {
      console.log({
        roomId,
        user1: { name: room.user1.name, socketId: room.user1.socket.id },
        user2: { name: room.user2.name, socketId: room.user2.socket.id },
      });
    }
  }

  getRoomBySocketId(socketId: string): { roomId: string; room: Room } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (
        room.user1.socket.id === socketId ||
        room.user2.socket.id === socketId
      ) {
        return { roomId, room };
      }
    }
    return null;
  }

  getPeerSocketFromRoomBySocketId(room: Room, socketId: string): Socket | null {
    const { user1, user2 } = room;

    if (user1.socket.id === socketId) return user2.socket;
    if (user2.socket.id === socketId) return user1.socket;

    return null;
  }

  getPeerSocketBySocketId(socketId: string): Socket | null {
    const roomData = this.getRoomBySocketId(socketId);
    if (!roomData) return null;

    const { room } = roomData;
    const { user1, user2 } = room;

    if (user1.socket.id === socketId) return user2.socket;
    if (user2.socket.id === socketId) return user1.socket;

    return null;
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  createRoom(user1: User, user2: User, allUsers: User[]) {
    const roomId = this.generate().toString();

    this.rooms.set(roomId.toString(), {
      user1,
      user2,
    });

    user1.socket.emit("send-offer", {
      roomId,
    });

    user2.socket.emit("send-offer", {
      roomId,
    });
  }

  onOffer(roomId: string, sdp: string, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    const receivingUser =
      room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    const sendingUser =
      room.user1.socket.id === senderSocketid ? room.user1 : room.user2;

    // Emit peerName to both users at offer stage
    sendingUser.socket.emit("matched", { peerName: receivingUser.name });
    receivingUser.socket.emit("matched", { peerName: sendingUser.name });

    receivingUser?.socket.emit("offer", {
      sdp,
      roomId,
    });
  }

  onAnswer(roomId: string, sdp: string, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    const receivingUser =
      room.user1.socket.id === senderSocketid ? room.user2 : room.user1;

    receivingUser?.socket.emit("answer", {
      sdp,
      roomId,
    });

    this.printAllRooms();
  }

  onIceCandidates(
    roomId: string,
    senderSocketid: string,
    candidate: any,
    type: "sender" | "receiver"
  ) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    const receivingUser =
      room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    receivingUser.socket.emit("add-ice-candidate", { candidate, type });
  }

  generate() {
    return GLOBAL_ROOM_ID++;
  }
}
