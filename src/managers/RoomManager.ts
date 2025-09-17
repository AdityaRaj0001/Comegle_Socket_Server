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
  //create a function to get room by roomId return like this id and room
  getRoomByRoomId(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  //need to remove this shit
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

  // 🧹 When users just leave but stay in lobby
  removeRoomOnLeave(
    roomId: string,
    userIndex: Map<string, { type: string; topic?: string; roomId?: string }>
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const { user1, user2 } = room;

    const u1 = userIndex.get(user1.socket.id);
    if (u1) u1.roomId = undefined;

    const u2 = userIndex.get(user2.socket.id);
    if (u2) u2.roomId = undefined;

    this.rooms.delete(roomId);
    console.log(`Room ${roomId} removed (leave).`);
  }

  // 🗑️ When one user exits or disconnects from lobby entirely
  removeRoomOnExit(
    roomId: string,
    exitingSocketId: string,
    userIndex: Map<string, { type: string; topic?: string; roomId?: string }>
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const { user1, user2 } = room;

    const peerSocketId =
      user1.socket.id === exitingSocketId ? user2.socket.id : user1.socket.id;

    // Clear peer's roomId
    const peerMeta = userIndex.get(peerSocketId);
    if (peerMeta) peerMeta.roomId = undefined;

    // Remove exiting user entirely
    userIndex.delete(exitingSocketId);

    this.rooms.delete(roomId);
    console.log(`Room ${roomId} removed (exit/disconnect).`);
  }

  createRoom(user1: User, user2: User) {
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
    return roomId;
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
    sendingUser.socket.emit("matched", {
      peerUser: {
        name: receivingUser.name,
        college: receivingUser.college,
        gender: receivingUser.gender,
      },
      roomId,
    });
    receivingUser.socket.emit("matched", {
      peerUser: {
        name: sendingUser.name,
        college: sendingUser.college,
        gender: sendingUser.gender,
      },
      roomId,
    });

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
