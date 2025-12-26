import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, initializeGameState, processCardPlay, advanceRound } from "./storage";
import type { ClientToServerEvent, ServerToClientEvent, Room, GameState, Player } from "@shared/schema";
import { randomUUID } from "crypto";

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  roomId?: string;
}

const clients = new Map<WebSocket, ClientConnection>();
const roomTimers = new Map<string, NodeJS.Timeout>();

function send(ws: WebSocket, event: ServerToClientEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function broadcast(roomId: string, event: ServerToClientEvent, excludePlayerId?: string) {
  const room = storage.getRoom(roomId);
  if (!room) return;

  clients.forEach((client) => {
    if (client.roomId === roomId && client.playerId !== excludePlayerId) {
      send(client.ws, event);
    }
  });
}

function broadcastToRoom(roomId: string, event: ServerToClientEvent) {
  clients.forEach((client) => {
    if (client.roomId === roomId) {
      send(client.ws, event);
    }
  });
}

function startRoundTimer(roomId: string, gameState: GameState) {
  // Clear existing timer
  const existingTimer = roomTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  const timer = setInterval(() => {
    const room = storage.getRoom(roomId);
    if (!room || !room.gameState) {
      clearInterval(timer);
      roomTimers.delete(roomId);
      return;
    }

    const gs = room.gameState;
    
    if (gs.phase !== 'playing' || !gs.round.isActive) {
      return;
    }

    gs.round.timeRemaining--;

    // Broadcast timer tick
    broadcastToRoom(roomId, { 
      type: 'timer_tick', 
      timeRemaining: gs.round.timeRemaining 
    });

    // Check if round ended
    if (gs.round.timeRemaining <= 0) {
      gs.round.isActive = false;
      gs.phase = 'round_transition';
      
      storage.updateRoom(room);
      
      // Broadcast round end
      broadcastToRoom(roomId, { 
        type: 'game_update', 
        gameState: gs 
      });

      // Process round transition after a delay
      setTimeout(() => {
        const currentRoom = storage.getRoom(roomId);
        if (!currentRoom || !currentRoom.gameState) return;

        const result = advanceRound(currentRoom.gameState);
        
        if (result.eliminated) {
          broadcastToRoom(roomId, {
            type: 'elimination_notice',
            playerId: result.eliminated.id,
            roundNumber: currentRoom.gameState.round.roundNumber
          });
        }

        storage.updateRoom(currentRoom);

        if (currentRoom.gameState.phase === 'game_over') {
          clearInterval(timer);
          roomTimers.delete(roomId);
          
          // Add winner to leaderboard
          if (currentRoom.gameState.winner) {
            storage.addLeaderboardEntry(
              currentRoom.gameState.winner.name,
              currentRoom.gameState.winner.score
            );
          }
          
          // Broadcast game over
          const sortedPlayers = [...currentRoom.gameState.players]
            .sort((a, b) => b.score - a.score);
          
          broadcastToRoom(roomId, {
            type: 'game_over',
            winner: currentRoom.gameState.winner!,
            finalScores: sortedPlayers
          });
          
          // Send updated leaderboard
          broadcastToRoom(roomId, {
            type: 'leaderboard_update',
            entries: storage.getTopLeaderboard(10)
          });
        } else {
          // Broadcast new round
          broadcastToRoom(roomId, { 
            type: 'game_update', 
            gameState: currentRoom.gameState 
          });
        }
      }, 3000); // 3 second transition
    }

    storage.updateRoom(room);
  }, 1000);

  roomTimers.set(roomId, timer);
}

function handleMessage(ws: WebSocket, data: ClientToServerEvent) {
  const client = clients.get(ws);
  if (!client) return;

  switch (data.type) {
    case 'create_room': {
      const room = storage.createRoom(client.playerId, data.playerName);
      client.roomId = room.id;
      
      send(ws, { 
        type: 'room_created', 
        room, 
        playerId: client.playerId 
      });
      
      // Send leaderboard
      send(ws, {
        type: 'leaderboard_update',
        entries: storage.getTopLeaderboard(10)
      });
      break;
    }

    case 'join_room': {
      const room = storage.getRoomByCode(data.roomCode);
      
      if (!room) {
        send(ws, { type: 'error', message: 'Raum nicht gefunden' });
        return;
      }

      if (room.players.length >= 4) {
        send(ws, { type: 'error', message: 'Raum ist voll' });
        return;
      }

      if (room.gameState) {
        send(ws, { type: 'error', message: 'Spiel bereits gestartet' });
        return;
      }

      const newPlayer: Player = {
        id: client.playerId,
        name: data.playerName,
        score: 0,
        combo: 0,
        isEliminated: false,
        isReady: false,
        tower: [],
        hand: []
      };

      room.players.push(newPlayer);
      client.roomId = room.id;
      storage.updateRoom(room);

      send(ws, { 
        type: 'room_joined', 
        room, 
        playerId: client.playerId 
      });
      
      // Send leaderboard
      send(ws, {
        type: 'leaderboard_update',
        entries: storage.getTopLeaderboard(10)
      });

      // Broadcast to others
      broadcast(room.id, { type: 'room_update', room }, client.playerId);
      break;
    }

    case 'leave_room': {
      if (!client.roomId) return;
      
      const room = storage.getRoom(client.roomId);
      if (!room) return;

      room.players = room.players.filter(p => p.id !== client.playerId);
      
      if (room.players.length === 0) {
        // Clear timer and delete room
        const timer = roomTimers.get(room.id);
        if (timer) {
          clearInterval(timer);
          roomTimers.delete(room.id);
        }
        storage.deleteRoom(room.id);
      } else {
        // If host left, assign new host
        if (room.hostId === client.playerId) {
          room.hostId = room.players[0].id;
        }
        storage.updateRoom(room);
        broadcast(room.id, { type: 'room_update', room });
      }

      client.roomId = undefined;
      break;
    }

    case 'set_ready': {
      if (!client.roomId) return;
      
      const room = storage.getRoom(client.roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === client.playerId);
      if (player) {
        player.isReady = data.ready;
        storage.updateRoom(room);
        broadcastToRoom(room.id, { type: 'room_update', room });
      }
      break;
    }

    case 'start_game': {
      if (!client.roomId) return;
      
      const room = storage.getRoom(client.roomId);
      if (!room) return;

      if (room.hostId !== client.playerId) {
        send(ws, { type: 'error', message: 'Nur der Host kann das Spiel starten' });
        return;
      }

      if (!room.players.every(p => p.isReady)) {
        send(ws, { type: 'error', message: 'Nicht alle Spieler sind bereit' });
        return;
      }

      const gameState = initializeGameState(room);
      room.gameState = gameState;
      storage.updateRoom(room);

      broadcastToRoom(room.id, { type: 'game_started', gameState });
      
      // Start timer
      startRoundTimer(room.id, gameState);
      break;
    }

    case 'play_card': {
      if (!client.roomId) return;
      
      const room = storage.getRoom(client.roomId);
      if (!room || !room.gameState) return;

      const gameState = room.gameState;
      
      if (gameState.phase !== 'playing' || !gameState.round.isActive) {
        return;
      }

      const result = processCardPlay(
        gameState, 
        client.playerId, 
        data.actionCardId, 
        data.towerCardId
      );

      if (result.comboTriggered) {
        broadcastToRoom(room.id, {
          type: 'combo_trigger',
          playerId: client.playerId,
          combo: result.newCombo
        });
      }

      storage.updateRoom(room);
      broadcastToRoom(room.id, { type: 'game_update', gameState });
      break;
    }

    case 'request_state': {
      if (!client.roomId) return;
      
      const room = storage.getRoom(client.roomId);
      if (room) {
        send(ws, { type: 'room_update', room });
        if (room.gameState) {
          send(ws, { type: 'game_update', gameState: room.gameState });
        }
      }
      
      send(ws, {
        type: 'leaderboard_update',
        entries: storage.getTopLeaderboard(10)
      });
      break;
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // REST API for leaderboard
  app.get('/api/leaderboard', (req, res) => {
    const entries = storage.getTopLeaderboard(10);
    res.json(entries);
  });

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const playerId = randomUUID();
    
    clients.set(ws, {
      ws,
      playerId
    });

    // Send initial leaderboard
    send(ws, {
      type: 'leaderboard_update',
      entries: storage.getTopLeaderboard(10)
    });

    ws.on('message', (message) => {
      try {
        const data: ClientToServerEvent = JSON.parse(message.toString());
        handleMessage(ws, data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });

    ws.on('close', () => {
      const client = clients.get(ws);
      if (client?.roomId) {
        // Simulate leave_room
        handleMessage(ws, { type: 'leave_room' });
      }
      clients.delete(ws);
    });
  });

  return httpServer;
}
