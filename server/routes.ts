import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { addRun, getLeaderboard as getLeaderboardFromDb } from "./db";
import { 
  getMultiplayerConfig, 
  getRoundTime, 
  MULTIPLAYER_TOTAL_ROUNDS, 
  SPEED_BONUS,
  shouldEliminateAfterRound,
  getEliminationStartRound
} from "@shared/schema";

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
  roundSpeedWinnerId: string | null; // Player who cleared first in current round
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
  // Use the new shouldEliminateAfterRound logic
  if (!shouldEliminateAfterRound(room.currentRound, room.playerCount)) return null;
  
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
  
  console.log('[WebSocket] Server started on path /ws');

  wss.on('connection', (ws, req) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    console.log(`[WebSocket] New connection from ${clientIp} - ${userAgent}`);
    
    let currentPlayerId: string | null = null;
    let currentRoomCode: string | null = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WebSocket] Received message: ${message.type}`, message.payload ? JSON.stringify(message.payload).substring(0, 100) : '');
        handleWSMessage(ws, message, currentPlayerId, currentRoomCode, (newPlayerId, newRoomCode) => {
          currentPlayerId = newPlayerId;
          currentRoomCode = newRoomCode;
        });
      } catch (e) {
        console.error('[WebSocket] Error parsing message:', e);
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
      }
    });

    ws.on('close', () => {
      if (currentPlayerId && currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          const disconnectedPlayerId = currentPlayerId;
          const disconnectedRoomCode = currentRoomCode;
          
          // During active game, use longer timeout (60 seconds) to prevent accidental removal
          // During lobby, use shorter timeout (10 seconds)
          const isGameActive = room.status === 'playing' || room.status === 'round_end';
          const timeout = isGameActive ? 60000 : 10000;
          
          console.log(`[WS] Player ${disconnectedPlayerId} disconnected from room ${disconnectedRoomCode} (status: ${room.status}), waiting ${timeout/1000}s for reconnect...`);
          
          setTimeout(() => {
            const roomAfterDelay = rooms.get(disconnectedRoomCode);
            if (roomAfterDelay) {
              const player = roomAfterDelay.players.get(disconnectedPlayerId);
              // Only remove if player still has the OLD disconnected websocket
              // If they reconnected, player.ws will be a new OPEN connection
              if (player && player.ws.readyState !== WebSocket.OPEN) {
                console.log(`[WS] Player ${disconnectedPlayerId} did not reconnect after ${timeout/1000}s, removing from room`);
                roomAfterDelay.players.delete(disconnectedPlayerId);
                playerToRoom.delete(disconnectedPlayerId);
                
                if (roomAfterDelay.players.size === 0) {
                  rooms.delete(disconnectedRoomCode);
                  clearRoundTimer(disconnectedRoomCode);
                  console.log(`[WS] Room ${disconnectedRoomCode} deleted (empty)`);
                } else {
                  if (!Array.from(roomAfterDelay.players.values()).some(p => p.isHost)) {
                    const firstPlayer = roomAfterDelay.players.values().next().value;
                    if (firstPlayer) {
                      firstPlayer.isHost = true;
                    }
                  }
                  broadcastToRoom(roomAfterDelay, {
                    type: 'room_update',
                    payload: { room: getRoomState(roomAfterDelay) }
                  });
                }
              } else if (player) {
                console.log(`[WS] Player ${disconnectedPlayerId} reconnected successfully`);
              }
            }
          }, timeout);
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
          totalRounds: MULTIPLAYER_TOTAL_ROUNDS,
          roundTimeLimit: 75, // Round 1 time
          playerCount: 1,
          roundSpeedWinnerId: null
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

        const roomCreatedMsg = JSON.stringify({
          type: 'room_created',
          payload: { 
            room: getRoomState(room),
            playerId 
          }
        });
        console.log('[WS] Sending room_created to', playerId, '- ws.readyState:', ws.readyState);
        ws.send(roomCreatedMsg);
        console.log('[WS] room_created sent successfully');
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
            room.totalRounds = MULTIPLAYER_TOTAL_ROUNDS; // Always 10 rounds
            room.currentRound = 1;
            room.roundTimeLimit = getRoundTime(1, room.playerCount);
            room.status = 'playing';
            room.gameSeed = Date.now();
            room.roundSpeedWinnerId = null; // Reset for new game

            for (const [playerId, p] of Array.from(room.players.entries())) {
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
              const { score, finishReason, cardsRemaining } = message.payload;
              player.score = score;
              player.cardsRemaining = cardsRemaining || 0;
              
              // Check for speed bonus - first player to clear all cards
              let speedBonusAwarded = false;
              if (cardsRemaining === 0 && room.roundSpeedWinnerId === null) {
                room.roundSpeedWinnerId = player.id;
                player.score += SPEED_BONUS;
                speedBonusAwarded = true;
                console.log(`[Speed Bonus] ${player.name} cleared first! +${SPEED_BONUS} points`);
                
                // Broadcast speed bonus to all players
                broadcastToRoom(room, {
                  type: 'speed_bonus_awarded',
                  payload: {
                    playerId: player.id,
                    playerName: player.name,
                    round: room.currentRound,
                    bonus: SPEED_BONUS
                  }
                });
              }
              
              player.totalScore += player.score;
              player.finished = true;
              player.isReady = false;
              
              console.log(`[Round] Player ${player.name} finished round ${room.currentRound} with score ${player.score}${speedBonusAwarded ? ' (includes speed bonus)' : ''} (reason: ${finishReason})`);

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

              // Check if all CONNECTED active players are ready (disconnected players don't block)
              const activePlayers = getConnectedActivePlayers(room);
              const allReady = activePlayers.length > 0 && activePlayers.every(p => p.isReady);

              if (allReady) {
                // Start next round
                room.currentRound++;
                room.roundTimeLimit = getRoundTime(room.currentRound, room.playerCount);
                room.gameSeed = Date.now() + room.currentRound; // New seed for new round
                room.status = 'playing';
                room.roundSpeedWinnerId = null; // Reset speed bonus tracker for new round

                for (const [playerId, p] of Array.from(room.players.entries())) {
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
                totalScore: p.totalScore,
                cardsRemaining: p.cardsRemaining,
                finished: p.finished,
                isEliminated: p.isEliminated
              }));

            ws.send(JSON.stringify({
              type: 'opponent_update',
              payload: { opponents }
            }));
            
            console.log(`[Rejoin] Player ${player.name} rejoined room ${roomCode}, sent ${opponents.length} opponents`);
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
              // Check for speed bonus - first player to clear all cards
              let speedBonusAwarded = false;
              if (cardsRemaining === 0 && room.roundSpeedWinnerId === null) {
                room.roundSpeedWinnerId = player.id;
                player.score += SPEED_BONUS;
                speedBonusAwarded = true;
                console.log(`[Speed Bonus via game_update] ${player.name} cleared first! +${SPEED_BONUS} points`);
                
                broadcastToRoom(room, {
                  type: 'speed_bonus_awarded',
                  payload: {
                    playerId: player.id,
                    playerName: player.name,
                    round: room.currentRound,
                    bonus: SPEED_BONUS
                  }
                });
              }
              
              // Add score to totalScore before marking finished
              player.totalScore += player.score;
              player.finished = true;
              
              console.log(`[Round via game_update] Player ${player.name} finished round ${room.currentRound} with score ${player.score}${speedBonusAwarded ? ' (includes speed bonus)' : ''}`);
              
              broadcastToRoom(room, {
                type: 'player_finished',
                payload: { playerId, playerName: player.name, score: player.score }
              });
              
              // Check if all connected active players have finished the round
              const connectedPlayers = getConnectedActivePlayers(room);
              const allFinished = connectedPlayers.length > 0 && connectedPlayers.every(p => p.finished);
              
              if (allFinished && room.status === 'playing') {
                console.log(`[Round via game_update] All ${connectedPlayers.length} connected players finished! Transitioning to round_end`);
                
                // Clear the server-side timer
                const existingTimer = roundTimers.get(roomCode);
                if (existingTimer) {
                  clearTimeout(existingTimer);
                  roundTimers.delete(roomCode);
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

  // POST /api/run - Add a new run to SQLite database
  const runSchema = z.object({
    name: z.string().min(1).max(50),
    points: z.number().int().min(0)
  });

  app.post("/api/run", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    const result = runSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.message 
      });
    }
    
    const { name, points } = result.data;
    
    try {
      const entry = addRun(name, points);
      res.json({ success: true, entry });
    } catch (error) {
      console.error('Error adding run:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }
  });

  // GET /api/leaderboard - Get top 10 from SQLite database
  app.get("/api/leaderboard", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const entries = getLeaderboardFromDb(10);
      res.json(entries);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Legacy: POST /api/leaderboard for in-memory leaderboard (deprecated)
  const submitScoreSchema = z.object({
    playerName: z.string().min(1).max(20),
    score: z.number().int().min(0)
  });

  app.post("/api/leaderboard", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const result = submitScoreSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }
    
    const { playerName, score } = result.data;
    const entry = storage.addLeaderboardEntry(playerName, score);
    
    if (entry) {
      res.json(entry);
    } else {
      res.json({ message: "Score not high enough for top 10" });
    }
  });
}
