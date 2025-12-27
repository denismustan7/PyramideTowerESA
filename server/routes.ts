import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { getMultiplayerConfig, getRoundTime, BASE_TIME } from "@shared/schema";

interface Room {
  code: string;
  players: Map<string, RoomPlayer>;
  gameSeed: number | null;
  status: 'waiting' | 'playing' | 'round_end' | 'finished';
  maxPlayers: number;
  createdAt: number;
  currentRound: number;
  totalRounds: number;
  roundTimeLimit: number;
  playerCount: number; // Number of players when game started
}

interface RoomPlayer {
  id: string;
  name: string;
  score: number; // Current round score
  totalScore: number; // Cumulative score
  cardsRemaining: number;
  isReady: boolean;
  isHost: boolean;
  finished: boolean;
  isEliminated: boolean;
  eliminatedInRound: number | null;
  ws: WebSocket;
}

const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>();
const roundTimers = new Map<string, NodeJS.Timeout>();

// Force round end if not all players have finished after timeout
function forceRoundEnd(roomCode: string) {
  const room = rooms.get(roomCode);
  console.log(`[ForceRoundEnd] Called for room ${roomCode}, room exists: ${!!room}, status: ${room?.status}`);
  if (!room || room.status !== 'playing') {
    console.log(`[ForceRoundEnd] Skipped - room not in playing state`);
    return;
  }
  
  console.log(`[ForceRoundEnd] Force ending round ${room.currentRound} for room ${roomCode}`);
  
  // Mark all active players as finished if they haven't already
  const activePlayers = getActivePlayers(room);
  for (const player of activePlayers) {
    if (!player.finished) {
      // Add current score to total score before marking finished
      player.totalScore += player.score;
      player.finished = true;
      
      // Broadcast that this player has finished to keep clients in sync
      broadcastToRoom(room, {
        type: 'player_finished',
        payload: {
          playerId: player.id,
          playerName: player.name,
          score: player.score,
          finishReason: 'time'
        }
      });
    }
  }
  
  room.status = 'round_end';
  
  // Check for elimination
  const eliminatedPlayer = checkAndEliminatePlayer(room);
  
  if (eliminatedPlayer) {
    broadcastToRoom(room, {
      type: 'player_eliminated',
      payload: {
        playerId: eliminatedPlayer.id,
        playerName: eliminatedPlayer.name,
        round: room.currentRound,
        totalScore: eliminatedPlayer.totalScore
      }
    });
  }

  // Check if game is over
  if (checkGameOver(room)) {
    room.status = 'finished';
    const ranking = Array.from(room.players.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        totalScore: p.totalScore,
        isEliminated: p.isEliminated,
        eliminatedInRound: p.eliminatedInRound
      }));

    broadcastToRoom(room, {
      type: 'game_over',
      payload: { ranking }
    });
  } else {
    // Send round end to all players
    const standings = Array.from(room.players.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        totalScore: p.totalScore,
        isEliminated: p.isEliminated,
        eliminatedInRound: p.eliminatedInRound
      }));

    broadcastToRoom(room, {
      type: 'round_end',
      payload: {
        round: room.currentRound,
        standings,
        nextRound: room.currentRound + 1,
        nextRoundTime: getRoundTime(room.currentRound + 1, room.playerCount),
        eliminatedId: eliminatedPlayer?.id || null,
        eliminatedName: eliminatedPlayer?.name || null
      }
    });
  }
}

function startRoundTimer(roomCode: string, timeLimit: number) {
  // Clear any existing timer
  const existingTimer = roundTimers.get(roomCode);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  const totalTime = (timeLimit + 3) * 1000;
  console.log(`[Timer] Starting ${totalTime/1000}s timer for room ${roomCode} (round time: ${timeLimit}s + 3s grace)`);
  
  // Add 3 second grace period for network latency
  const timeout = setTimeout(() => {
    console.log(`[Timer] Timer expired for room ${roomCode}, calling forceRoundEnd`);
    forceRoundEnd(roomCode);
    roundTimers.delete(roomCode);
  }, totalTime);
  
  roundTimers.set(roomCode, timeout);
}

function clearRoundTimer(roomCode: string) {
  const timer = roundTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    roundTimers.delete(roomCode);
  }
}

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
    totalScore: p.totalScore,
    cardsRemaining: p.cardsRemaining,
    isReady: p.isReady,
    isHost: p.isHost,
    finished: p.finished,
    isEliminated: p.isEliminated,
    eliminatedInRound: p.eliminatedInRound
  }));
  
  return {
    code: room.code,
    players,
    gameSeed: room.gameSeed,
    status: room.status,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    roundTimeLimit: room.roundTimeLimit
  };
}

function getActivePlayers(room: Room): RoomPlayer[] {
  return Array.from(room.players.values()).filter(p => !p.isEliminated);
}

// Get players who are still connected (for determining if round can proceed)
function getConnectedActivePlayers(room: Room): RoomPlayer[] {
  return Array.from(room.players.values()).filter(p => 
    !p.isEliminated && p.ws.readyState === WebSocket.OPEN
  );
}

function checkAndEliminatePlayer(room: Room): RoomPlayer | null {
  const config = getMultiplayerConfig(room.playerCount);
  
  // Only eliminate if we're at or past the elimination start round
  if (room.currentRound < config.eliminationStartRound) return null;
  
  const activePlayers = getActivePlayers(room);
  if (activePlayers.length <= 1) return null; // Don't eliminate if only 1 player left
  
  // Find the player with the lowest total score
  const lowestPlayer = activePlayers.reduce((lowest, player) => 
    player.totalScore < lowest.totalScore ? player : lowest
  );
  
  lowestPlayer.isEliminated = true;
  lowestPlayer.eliminatedInRound = room.currentRound;
  
  return lowestPlayer;
}

function checkGameOver(room: Room): boolean {
  const activePlayers = getActivePlayers(room);
  return activePlayers.length <= 1 || room.currentRound >= room.totalRounds;
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
          createdAt: Date.now(),
          currentRound: 1,
          totalRounds: 8,
          roundTimeLimit: BASE_TIME,
          playerCount: 1
        };

        room.players.set(playerId, {
          id: playerId,
          name: playerName,
          score: 0,
          totalScore: 0,
          cardsRemaining: 30,
          isReady: false,
          isHost: true,
          finished: false,
          isEliminated: false,
          eliminatedInRound: null,
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
          totalScore: 0,
          cardsRemaining: 30,
          isReady: false,
          isHost: false,
          finished: false,
          isEliminated: false,
          eliminatedInRound: null,
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

            // Set up game configuration based on player count
            room.playerCount = room.players.size;
            const config = getMultiplayerConfig(room.playerCount);
            room.totalRounds = config.totalRounds;
            room.currentRound = 1;
            room.roundTimeLimit = getRoundTime(1, room.playerCount);
            room.status = 'playing';
            room.gameSeed = Date.now();

            for (const [playerId, p] of room.players) {
              p.score = 0;
              p.totalScore = 0;
              p.cardsRemaining = 30;
              p.finished = false;
              p.isReady = false;
              p.isEliminated = false;
              p.eliminatedInRound = null;

              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'game_started',
                  payload: {
                    roomCode: room.code,
                    playerId,
                    seed: room.gameSeed,
                    currentRound: room.currentRound,
                    totalRounds: room.totalRounds,
                    roundTimeLimit: room.roundTimeLimit,
                    playerCount: room.playerCount
                  }
                }));
              }
            }
            
            // Start server-side round timer as backup
            startRoundTimer(room.code, room.roundTimeLimit);
          }
        }
        break;
      }

      case 'round_finished': {
        if (currentPlayerId && currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room) {
            const player = room.players.get(currentPlayerId);
            if (player && !player.isEliminated && !player.finished) {
              const { score, finishReason } = message.payload;
              player.score = score;
              player.totalScore += score;
              player.finished = true;
              player.isReady = false;
              
              console.log(`[Round] Player ${player.name} finished round ${room.currentRound} with score ${score} (reason: ${finishReason})`);

              // Broadcast that this player has finished to all other players
              broadcastToRoom(room, {
                type: 'player_finished',
                payload: {
                  playerId: player.id,
                  playerName: player.name,
                  score: player.score,
                  finishReason: finishReason || 'unknown'
                }
              }, currentPlayerId);

              // Check if all connected active players have finished the round
              // Use connectedActivePlayers so disconnected players don't block progress
              const connectedPlayers = getConnectedActivePlayers(room);
              const allActivePlayers = getActivePlayers(room);
              console.log(`[Round] Connected: ${connectedPlayers.length}, Total active: ${allActivePlayers.length}`);
              console.log(`[Round] Finished: ${connectedPlayers.filter(p => p.finished).map(p => p.name).join(', ')}, Not finished: ${connectedPlayers.filter(p => !p.finished).map(p => p.name).join(', ')}`);
              
              // Round ends if all connected players are finished (disconnected players are treated as finished)
              const allConnectedFinished = connectedPlayers.every(p => p.finished);
              const allFinished = allConnectedFinished && connectedPlayers.length > 0;

              if (allFinished) {
                console.log(`[Round] All ${connectedPlayers.length} connected players finished! Transitioning to round_end`);
                // Clear the server-side timer since all finished
                clearRoundTimer(currentRoomCode);
                
                room.status = 'round_end';
                
                // Check for elimination
                const eliminatedPlayer = checkAndEliminatePlayer(room);
                
                if (eliminatedPlayer) {
                  broadcastToRoom(room, {
                    type: 'player_eliminated',
                    payload: {
                      playerId: eliminatedPlayer.id,
                      playerName: eliminatedPlayer.name,
                      round: room.currentRound,
                      totalScore: eliminatedPlayer.totalScore
                    }
                  });
                }

                // Check if game is over
                if (checkGameOver(room)) {
                  room.status = 'finished';
                  const ranking = Array.from(room.players.values())
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map(p => ({
                      id: p.id,
                      name: p.name,
                      score: p.score,
                      totalScore: p.totalScore,
                      isEliminated: p.isEliminated,
                      eliminatedInRound: p.eliminatedInRound
                    }));

                  broadcastToRoom(room, {
                    type: 'game_over',
                    payload: { ranking }
                  });
                } else {
                  // Send round end to all players
                  const standings = Array.from(room.players.values())
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map(p => ({
                      id: p.id,
                      name: p.name,
                      score: p.score,
                      totalScore: p.totalScore,
                      isEliminated: p.isEliminated,
                      eliminatedInRound: p.eliminatedInRound
                    }));

                  broadcastToRoom(room, {
                    type: 'round_end',
                    payload: {
                      round: room.currentRound,
                      standings,
                      nextRound: room.currentRound + 1,
                      nextRoundTime: getRoundTime(room.currentRound + 1, room.playerCount),
                      eliminatedId: eliminatedPlayer?.id || null,
                      eliminatedName: eliminatedPlayer?.name || null
                    }
                  });
                }
              }

              // Update all players about opponent states
              for (const [pid, pl] of Array.from(room.players.entries())) {
                const opponentsForPlayer = Array.from(room.players.values())
                  .filter(p => p.id !== pid)
                  .map(p => ({
                    id: p.id,
                    name: p.name,
                    score: p.score,
                    totalScore: p.totalScore,
                    cardsRemaining: p.cardsRemaining,
                    finished: p.finished,
                    isEliminated: p.isEliminated
                  }));

                if (pl.ws.readyState === WebSocket.OPEN) {
                  pl.ws.send(JSON.stringify({
                    type: 'opponent_update',
                    payload: { opponents: opponentsForPlayer }
                  }));
                }
              }
            }
          }
        }
        break;
      }

      case 'ready_for_next_round': {
        if (currentPlayerId && currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room && room.status === 'round_end') {
            const player = room.players.get(currentPlayerId);
            if (player && !player.isEliminated) {
              player.isReady = true;

              // Broadcast ready status
              broadcastToRoom(room, {
                type: 'room_update',
                payload: { room: getRoomState(room) }
              });

              // Check if all active players are ready
              const activePlayers = getActivePlayers(room);
              const allReady = activePlayers.every(p => p.isReady);

              if (allReady) {
                // Start next round
                room.currentRound++;
                room.roundTimeLimit = getRoundTime(room.currentRound, room.playerCount);
                room.gameSeed = Date.now() + room.currentRound; // New seed for new round
                room.status = 'playing';

                for (const [playerId, p] of room.players) {
                  p.score = 0;
                  p.cardsRemaining = 30;
                  p.finished = false;
                  p.isReady = false;

                  if (p.ws.readyState === WebSocket.OPEN) {
                    p.ws.send(JSON.stringify({
                      type: 'round_started',
                      payload: {
                        currentRound: room.currentRound,
                        totalRounds: room.totalRounds,
                        roundTimeLimit: room.roundTimeLimit,
                        seed: room.gameSeed,
                        isEliminated: p.isEliminated
                      }
                    }));
                  }
                }
                
                // Start server-side round timer as backup
                startRoundTimer(room.code, room.roundTimeLimit);
              }
            }
          }
        }
        break;
      }

      case 'spectate_player': {
        if (currentPlayerId && currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room) {
            const spectator = room.players.get(currentPlayerId);
            const { targetPlayerId } = message.payload;
            const targetPlayer = room.players.get(targetPlayerId);
            
            // Allow spectating if eliminated OR if finished waiting for others
            const canSpectate = spectator && (spectator.isEliminated || spectator.finished);
            
            if (canSpectate && targetPlayer && !targetPlayer.isEliminated && targetPlayer.id !== currentPlayerId) {
              console.log(`[Spectate] ${spectator.name} is now spectating ${targetPlayer.name}`);
              ws.send(JSON.stringify({
                type: 'spectator_update',
                payload: {
                  spectatingPlayerId: targetPlayerId,
                  playerName: targetPlayer.name,
                  score: targetPlayer.score,
                  totalScore: targetPlayer.totalScore,
                  cardsRemaining: targetPlayer.cardsRemaining,
                  seed: room.gameSeed // Send the seed so they can render the same board
                }
              }));
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
            
            // Only mark finished if not already finished
            if (finished && !player.finished) {
              player.finished = finished;
              broadcastToRoom(room, {
                type: 'player_finished',
                payload: { playerId, playerName: player.name }
              });
            }

            for (const [pid, pl] of Array.from(room.players.entries())) {
              const opponentsForPlayer = Array.from(room.players.values())
                .filter(p => p.id !== pid)
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  totalScore: p.totalScore,
                  cardsRemaining: p.cardsRemaining,
                  finished: p.finished,
                  isEliminated: p.isEliminated
                }));

              if (pl.ws.readyState === WebSocket.OPEN) {
                pl.ws.send(JSON.stringify({
                  type: 'opponent_update',
                  payload: { opponents: opponentsForPlayer }
                }));
              }
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
