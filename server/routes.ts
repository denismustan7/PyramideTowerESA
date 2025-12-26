import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";

interface Room {
  code: string;
  players: Map<string, RoomPlayer>;
  gameSeed: number | null;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: number;
}

interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  cardsRemaining: number;
  isReady: boolean;
  isHost: boolean;
  finished: boolean;
  ws: WebSocket;
}

const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function broadcastToRoom(room: Room, message: object, excludePlayerId?: string) {
  const msg = JSON.stringify(message);
  const entries = Array.from(room.players.entries());
  for (const [playerId, player] of entries) {
    if (playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msg);
    }
  }
}

function getRoomState(room: Room) {
  const players = Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    cardsRemaining: p.cardsRemaining,
    isReady: p.isReady,
    isHost: p.isHost,
    finished: p.finished
  }));
  
  return {
    code: room.code,
    players,
    gameSeed: room.gameSeed,
    status: room.status,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentPlayerId: string | null = null;
    let currentRoomCode: string | null = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWSMessage(ws, message, currentPlayerId, currentRoomCode, (newPlayerId, newRoomCode) => {
          currentPlayerId = newPlayerId;
          currentRoomCode = newRoomCode;
        });
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
      }
    });

    ws.on('close', () => {
      if (currentPlayerId && currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.players.delete(currentPlayerId);
          playerToRoom.delete(currentPlayerId);
          
          if (room.players.size === 0) {
            rooms.delete(currentRoomCode);
          } else {
            if (!Array.from(room.players.values()).some(p => p.isHost)) {
              const firstPlayer = room.players.values().next().value;
              if (firstPlayer) {
                firstPlayer.isHost = true;
              }
            }
            broadcastToRoom(room, {
              type: 'room_update',
              payload: { room: getRoomState(room) }
            });
          }
        }
      }
    });
  });

  function handleWSMessage(
    ws: WebSocket, 
    message: { type: string; payload?: any },
    currentPlayerId: string | null,
    currentRoomCode: string | null,
    setContext: (playerId: string | null, roomCode: string | null) => void
  ) {
    switch (message.type) {
      case 'create_room': {
        const { playerName } = message.payload;
        const playerId = generatePlayerId();
        let roomCode = generateRoomCode();
        
        while (rooms.has(roomCode)) {
          roomCode = generateRoomCode();
        }

        const room: Room = {
          code: roomCode,
          players: new Map(),
          gameSeed: null,
          status: 'waiting',
          maxPlayers: 6,
          createdAt: Date.now()
        };

        room.players.set(playerId, {
          id: playerId,
          name: playerName,
          score: 0,
          cardsRemaining: 28,
          isReady: false,
          isHost: true,
          finished: false,
          ws
        });

        rooms.set(roomCode, room);
        playerToRoom.set(playerId, roomCode);
        setContext(playerId, roomCode);

        ws.send(JSON.stringify({
          type: 'room_created',
          payload: { 
            room: getRoomState(room),
            playerId 
          }
        }));
        break;
      }

      case 'join_room': {
        const { playerName, roomCode } = message.payload;
        const room = rooms.get(roomCode);

        if (!room) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Raum nicht gefunden' }
          }));
          return;
        }

        if (room.status !== 'waiting') {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Spiel bereits gestartet' }
          }));
          return;
        }

        if (room.players.size >= room.maxPlayers) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Raum ist voll' }
          }));
          return;
        }

        const playerId = generatePlayerId();
        room.players.set(playerId, {
          id: playerId,
          name: playerName,
          score: 0,
          cardsRemaining: 28,
          isReady: false,
          isHost: false,
          finished: false,
          ws
        });

        playerToRoom.set(playerId, roomCode);
        setContext(playerId, roomCode);

        ws.send(JSON.stringify({
          type: 'room_joined',
          payload: { 
            room: getRoomState(room),
            playerId 
          }
        }));

        broadcastToRoom(room, {
          type: 'room_update',
          payload: { room: getRoomState(room) }
        }, playerId);
        break;
      }

      case 'leave_room': {
        if (currentPlayerId && currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room) {
            room.players.delete(currentPlayerId);
            playerToRoom.delete(currentPlayerId);

            if (room.players.size === 0) {
              rooms.delete(currentRoomCode);
            } else {
              if (!Array.from(room.players.values()).some(p => p.isHost)) {
                const firstPlayer = room.players.values().next().value;
                if (firstPlayer) {
                  firstPlayer.isHost = true;
                }
              }
              broadcastToRoom(room, {
                type: 'room_update',
                payload: { room: getRoomState(room) }
              });
            }
          }
          setContext(null, null);
        }
        break;
      }

      case 'set_ready': {
        if (currentPlayerId && currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room) {
            const player = room.players.get(currentPlayerId);
            if (player) {
              player.isReady = !player.isReady;
              broadcastToRoom(room, {
                type: 'room_update',
                payload: { room: getRoomState(room) }
              });
            }
          }
        }
        break;
      }

      case 'start_game': {
        if (currentPlayerId && currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room) {
            const player = room.players.get(currentPlayerId);
            
            if (!player?.isHost) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Nur der Host kann das Spiel starten' }
              }));
              return;
            }

            const allReady = Array.from(room.players.values()).every(p => p.isReady);
            if (!allReady || room.players.size < 2) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Nicht alle Spieler sind bereit' }
              }));
              return;
            }

            room.status = 'playing';
            room.gameSeed = Date.now();

            for (const [playerId, p] of room.players) {
              p.score = 0;
              p.cardsRemaining = 28;
              p.finished = false;

              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'game_started',
                  payload: {
                    roomCode: room.code,
                    playerId,
                    seed: room.gameSeed
                  }
                }));
              }
            }
          }
        }
        break;
      }

      case 'rejoin_game': {
        const { roomCode, playerId } = message.payload;
        const room = rooms.get(roomCode);
        
        if (room) {
          const player = room.players.get(playerId);
          if (player) {
            player.ws = ws;
            setContext(playerId, roomCode);

            const opponents = Array.from(room.players.values())
              .filter(p => p.id !== playerId)
              .map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                cardsRemaining: p.cardsRemaining,
                finished: p.finished
              }));

            ws.send(JSON.stringify({
              type: 'opponent_update',
              payload: { opponents }
            }));
          }
        }
        break;
      }

      case 'game_update': {
        const { playerId, roomCode, score, cardsRemaining, finished } = message.payload;
        const room = rooms.get(roomCode);

        if (room) {
          const player = room.players.get(playerId);
          if (player) {
            player.score = score;
            player.cardsRemaining = cardsRemaining;
            player.finished = finished;

            if (finished && !player.finished) {
              broadcastToRoom(room, {
                type: 'player_finished',
                payload: { playerId, playerName: player.name }
              });
            }

            for (const [pid, player] of Array.from(room.players.entries())) {
              const opponentsForPlayer = Array.from(room.players.values())
                .filter(p => p.id !== pid)
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  cardsRemaining: p.cardsRemaining,
                  finished: p.finished
                }));

              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: 'opponent_update',
                  payload: { opponents: opponentsForPlayer }
                }));
              }
            }

            const playersArray = Array.from(room.players.values());
            const allFinished = playersArray.every(p => 
              p.finished || p.cardsRemaining === 0
            );

            if (allFinished) {
              room.status = 'finished';
              const ranking = playersArray
                .sort((a, b) => b.score - a.score)
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  cardsRemaining: p.cardsRemaining,
                  finished: p.finished
                }));

              broadcastToRoom(room, {
                type: 'game_over',
                payload: { ranking }
              });
            }
          }
        }
        break;
      }
    }
  }

  app.get("/api/leaderboard/:type", (req, res) => {
    const type = req.params.type as 'daily' | 'global';
    
    if (type !== 'daily' && type !== 'global') {
      return res.status(400).json({ error: "Invalid leaderboard type" });
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    const entries = storage.getLeaderboard(type, limit);
    res.json(entries);
  });

  const submitScoreSchema = z.object({
    playerName: z.string().min(1).max(20),
    score: z.number().int().min(0)
  });

  app.post("/api/leaderboard", (req, res) => {
    const result = submitScoreSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }
    
    const { playerName, score } = result.data;
    const entry = storage.addLeaderboardEntry(playerName, score);
    res.json(entry);
  });
}
