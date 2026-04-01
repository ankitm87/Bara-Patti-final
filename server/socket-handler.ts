import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { GameState, PlayerState, Seat, Card, createInitialGameState, startNewRound, Trio } from "../lib/game-engine";
import * as db from "./db";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GameRoom {
  roomId: string;
  gameState: GameState;
  players: Map<string, PlayerState>; // socketId -> PlayerState
  hostSocketId: string;
}

// ─── Game Room Management ─────────────────────────────────────────────────────

const gameRooms = new Map<string, GameRoom>();
const autoPlayTimers = new Map<string, NodeJS.Timeout>();

export function initializeSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[socket] Player connected: ${socket.id}`);

    // ─── Room Management ─────────────────────────────────────────────────────

    socket.on("create-room", (data: { roomId: string; player: PlayerState }, callback) => {
      const room: GameRoom = {
        roomId: data.roomId,
        gameState: createInitialGameState(data.roomId),
        players: new Map(),
        hostSocketId: socket.id,
      };

      gameRooms.set(data.roomId, room);
      socket.join(data.roomId);

      // Add the host as the first player
      room.players.set(socket.id, { ...data.player, seat: 0 as Seat });
      room.gameState.players = Array.from(room.players.values());

      // Also sync to HTTP storage for polling
      db.createRoom(data.roomId, data.player.userId, data.player.odName || data.player.name);

      console.log(`[socket] Room created: ${data.roomId} by ${socket.id}`);
      callback({ success: true, roomId: data.roomId });
      io.to(data.roomId).emit("room-state", room.gameState);
    });

    socket.on("join-room", (data: { roomId: string; player: PlayerState }, callback) => {
      const room = gameRooms.get(data.roomId);
      if (!room) {
        callback({ success: false, error: "Room not found" });
        return;
      }

      socket.join(data.roomId);

      // Assign the next available seat
      const usedSeats = new Set(room.players.values().map((p) => p.seat));
      let assignedSeat: Seat = 0;
      for (let i = 0; i < 4; i++) {
        if (!usedSeats.has(i as Seat)) {
          assignedSeat = i as Seat;
          break;
        }
      }

      room.players.set(socket.id, { ...data.player, seat: assignedSeat });
      room.gameState.players = Array.from(room.players.values());

      // Also sync to HTTP storage
      db.addPlayerToRoom(data.roomId, data.player.userId, data.player.odName || data.player.name);

      console.log(`[socket] Player joined room ${data.roomId}: ${socket.id} as seat ${assignedSeat}`);
      callback({ success: true, seat: assignedSeat });
      io.to(data.roomId).emit("room-state", room.gameState);
    });

    socket.on("leave-room", (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      room.players.delete(socket.id);
      room.gameState.players = Array.from(room.players.values());

      if (room.players.size === 0) {
        gameRooms.delete(data.roomId);
        console.log(`[socket] Room deleted: ${data.roomId}`);
      } else {
        // If host left, assign new host
        if (socket.id === room.hostSocketId) {
          const nextHost = room.players.keys().next().value;
          if (nextHost) room.hostSocketId = nextHost;
        }
        io.to(data.roomId).emit("room-state", room.gameState);
      }

      socket.leave(data.roomId);
    });

    // ─── Game Actions ────────────────────────────────────────────────────────

    socket.on("set-ready", (data: { roomId: string; seat: Seat; isReady: boolean }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      const player = room.gameState.players.find((p) => p.seat === data.seat);
      if (player) {
        player.isReady = data.isReady;
      }

      io.to(data.roomId).emit("room-state", room.gameState);
    });

    socket.on("start-game", (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || socket.id !== room.hostSocketId) return;

      // Check if all players are ready
      const allReady = room.gameState.players.every((p) => p.isReady);
      if (!allReady || room.gameState.players.length < 4) return;

      // Start the game
      room.gameState = startNewRound(room.gameState);
      console.log(`[socket] Game started in room ${data.roomId}`);
      io.to(data.roomId).emit("game-state", room.gameState);
    });

    socket.on("play-card", (data: { roomId: string; seat: Seat; card: Card }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      // Validate it's the current player's turn
      if (room.gameState.currentPlayerSeat !== data.seat) return;
      
      // Clear auto-play timer if player played in time
      const timerId = `${data.roomId}-${data.seat}`;
      if (autoPlayTimers.has(timerId)) {
        clearTimeout(autoPlayTimers.get(timerId));
        autoPlayTimers.delete(timerId);
      }

      // Update game state (this would normally call the game engine)
      room.gameState.players = room.gameState.players.map((p) =>
        p.seat === data.seat
          ? { ...p, hand: p.hand.filter((c) => c.id !== data.card.id) }
          : p
      );

      // Add card to current trick
      if (room.gameState.currentTrick) {
        room.gameState.currentTrick.cards.push({ seat: data.seat, card: data.card });

        // If trick is complete (4 cards), determine winner
        if (room.gameState.currentTrick.cards.length === 4) {
          // Trick completion logic would go here
          room.gameState.phase = "trick_complete";
        } else {
          // Move to next player
          room.gameState.currentPlayerSeat = ((data.seat + 1) % 4) as Seat;
        }
      }

      io.to(data.roomId).emit("game-state", room.gameState);
    });

    socket.on("declare-trio", (data: { roomId: string; seat: Seat; trio: Trio }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      // Trio declaration logic
      io.to(data.roomId).emit("game-state", room.gameState);
    });

    socket.on("chat-message", (data: { roomId: string; seatNumber: number; message: string; timestamp: number }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      const player = room.gameState.players.find((p) => p.seat === data.seatNumber);
      if (!player) return;

      // Broadcast chat message to all players in the room
      io.to(data.roomId).emit("chat-message", {
        id: `${socket.id}-${data.timestamp}`,
        sender: player.name,
        text: data.message,
        timestamp: data.timestamp,
        seatNumber: data.seatNumber,
      });
    });

    socket.on("audio-message", (data: { roomId: string; seatNumber: number; audioUrl: string; duration: number; timestamp: number }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      const player = room.gameState.players.find((p) => p.seat === data.seatNumber);
      if (!player) return;

      // Broadcast audio message to all players in the room
      io.to(data.roomId).emit("audio-message", {
        id: `${socket.id}-${data.timestamp}`,
        sender: player.name,
        audioUrl: data.audioUrl,
        duration: data.duration,
        timestamp: data.timestamp,
        seatNumber: data.seatNumber,
      });
    });

    socket.on("emoji-reaction", (data: { roomId: string; seatNumber: number; emoji: string; timestamp: number }) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      const player = room.gameState.players.find((p) => p.seat === data.seatNumber);
      if (!player) return;

      // Broadcast emoji reaction to all players in the room
      io.to(data.roomId).emit("emoji-reaction", {
        id: `${socket.id}-${data.timestamp}`,
        sender: player.name,
        emoji: data.emoji,
        timestamp: data.timestamp,
        seatNumber: data.seatNumber,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] Player disconnected: ${socket.id}`);

      // Clean up any rooms this player was in
      for (const [roomId, room] of gameRooms.entries()) {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          room.gameState.players = Array.from(room.players.values());

          if (room.players.size === 0) {
            gameRooms.delete(roomId);
          } else {
            if (socket.id === room.hostSocketId) {
              const nextHost = room.players.keys().next().value;
              if (nextHost) room.hostSocketId = nextHost;
            }
            io.to(roomId).emit("room-state", room.gameState);
          }
        }
      }
    });
  });

  return io;
}

export function getGameRoom(roomId: string): GameRoom | undefined {
  return gameRooms.get(roomId);
}
