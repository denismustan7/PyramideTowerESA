import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database tables for persistence
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardEntries).pick({
  playerName: true,
  score: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardSchema>;

// Game Types (in-memory only)
export interface Card {
  id: string;
  value: number; // The card's face value (1-13)
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

export interface ActionCard {
  id: string;
  type: 'plus' | 'minus';
}

export interface Player {
  id: string;
  name: string;
  score: number;
  combo: number;
  isEliminated: boolean;
  isReady: boolean;
  tower: Card[];
  hand: ActionCard[];
  lastAction?: {
    type: 'plus' | 'minus';
    timestamp: number;
  };
}

export interface RoundState {
  roundNumber: number;
  timeRemaining: number;
  totalTime: number;
  isActive: boolean;
}

export type GamePhase = 'waiting' | 'countdown' | 'playing' | 'round_transition' | 'game_over';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  round: RoundState;
  players: Player[];
  eliminatedPlayerIds: string[];
  winner?: Player;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  gameState?: GameState;
  createdAt: number;
}

// WebSocket Event Types
export type ClientToServerEvent =
  | { type: 'create_room'; playerName: string }
  | { type: 'join_room'; roomCode: string; playerName: string }
  | { type: 'leave_room' }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'start_game' }
  | { type: 'play_card'; actionCardId: string; towerCardId: string }
  | { type: 'request_state' };

export type ServerToClientEvent =
  | { type: 'room_created'; room: Room; playerId: string }
  | { type: 'room_joined'; room: Room; playerId: string }
  | { type: 'room_update'; room: Room }
  | { type: 'game_started'; gameState: GameState }
  | { type: 'round_update'; round: RoundState }
  | { type: 'game_update'; gameState: GameState }
  | { type: 'timer_tick'; timeRemaining: number }
  | { type: 'combo_trigger'; playerId: string; combo: number }
  | { type: 'elimination_notice'; playerId: string; roundNumber: number }
  | { type: 'game_over'; winner: Player; finalScores: Player[] }
  | { type: 'leaderboard_update'; entries: LeaderboardEntry[] }
  | { type: 'error'; message: string };

// Game Constants
export const TOTAL_ROUNDS = 8;
export const BASE_ROUND_TIME = 60; // seconds
export const TIME_DECREASE_PER_ROUND = 5; // seconds decrease from round 4
export const ELIMINATION_START_ROUND = 5;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS_TO_START = 1;

// Helper function to calculate round time
export function getRoundTime(roundNumber: number): number {
  if (roundNumber < 4) {
    return BASE_ROUND_TIME;
  }
  // Round 4: 55s, Round 5: 50s, Round 6: 45s, Round 7: 40s, Round 8: 35s
  return BASE_ROUND_TIME - (roundNumber - 3) * TIME_DECREASE_PER_ROUND;
}

// Helper function to determine who gets eliminated
export function getEliminationRank(roundNumber: number): number | null {
  // After round 5, 4th place eliminated
  // After round 6, 3rd place eliminated
  // After round 7, 2nd place eliminated
  if (roundNumber === 5) return 4;
  if (roundNumber === 6) return 3;
  if (roundNumber === 7) return 2;
  return null;
}
