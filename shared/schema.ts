import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database table for leaderboard
export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  rank: text("rank").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format for daily grouping
});

export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({ id: true });
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof leaderboard.$inferSelect;

// Card suits and values
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  value: CardValue;
  isFaceUp: boolean;
  isPlayable: boolean; // Can be clicked (not covered by other cards)
}

// Pyramid node represents a card position in the tri-peaks structure
export interface PyramidNode {
  card: Card | null; // null if card was removed
  row: number; // 0-3 (0 = peak)
  col: number;
  peakIndex: number; // 0, 1, or 2
  coveredBy: string[]; // IDs of cards covering this one
}

// Bonus slot state
export interface BonusSlotState {
  card: Card | null; // Card currently on the slot
  isActive: boolean; // Whether the slot is unlocked
}

// Game state
export interface GameState {
  pyramids: PyramidNode[][]; // Three pyramids
  drawPile: Card[]; // Face-down draw pile
  discardPile: Card[]; // Face-up discard pile (top is current)
  bonusSlot1: BonusSlotState; // Unlocked at 4 combo
  bonusSlot2: BonusSlotState; // Unlocked at 7 combo
  bonusSlot1ActivationCount: number; // How many times slot 1 has been activated (for deterministic generation)
  bonusSlot2ActivationCount: number; // How many times slot 2 has been activated
  gameSeed: number; // Seed for deterministic random generation
  score: number;
  combo: number; // Current combo multiplier
  maxCombo: number; // Highest combo achieved this game
  level: number;
  timeRemaining: number; // Seconds
  totalTime: number; // Total time for this level
  towersCleared: number; // 0-3
  phase: 'playing' | 'paused' | 'won' | 'lost';
  cardsRemaining: number; // Cards still on pyramids
}

// Score breakdown for game over screen
export interface ScoreBreakdown {
  baseScore: number;
  comboBonus: number;
  towerBonus: number;
  timeBonus: number;
  perfectBonus: number;
  totalScore: number;
}

// Rank thresholds
export const RANK_THRESHOLDS = {
  NOVIZE: 0,
  ZAUBERLEHRLING: 10001,
  MAGIER: 30001,
  ERZMAGIER: 70001,
  TURMWAECHTER: 150001,
} as const;

export type RankName = 'Novize' | 'Zauberlehrling' | 'Magier' | 'Erzmagier' | 'Turmwächter';

export function getRank(totalScore: number): RankName {
  if (totalScore >= RANK_THRESHOLDS.TURMWAECHTER) return 'Turmwächter';
  if (totalScore >= RANK_THRESHOLDS.ERZMAGIER) return 'Erzmagier';
  if (totalScore >= RANK_THRESHOLDS.MAGIER) return 'Magier';
  if (totalScore >= RANK_THRESHOLDS.ZAUBERLEHRLING) return 'Zauberlehrling';
  return 'Novize';
}

// Card value sequence for +1/-1 matching
export const CARD_VALUES: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getValueIndex(value: CardValue): number {
  return CARD_VALUES.indexOf(value);
}

// Check if card can be played on discard pile (±1 with Ace wrap)
export function canPlayCard(cardValue: CardValue, discardTopValue: CardValue): boolean {
  const cardIdx = getValueIndex(cardValue);
  const discardIdx = getValueIndex(discardTopValue);
  
  // Normal +1/-1
  if (Math.abs(cardIdx - discardIdx) === 1) return true;
  
  // Ace wraps: A can go on K, K can go on A
  if ((cardValue === 'A' && discardTopValue === 'K') ||
      (cardValue === 'K' && discardTopValue === 'A')) {
    return true;
  }
  
  return false;
}

// Game constants
export const CARDS_PER_PYRAMID = 10; // Standard tri-peaks: 10 cards per peak
export const TOTAL_PYRAMID_CARDS = 28; // 3 peaks share some base cards
export const BASE_POINTS = 100;
export const TOWER_BONUS = 500;
export const PERFECT_BONUS = 5000;
export const TIME_BONUS_MULTIPLIER = 10;
export const BASE_TIME = 120; // 2 minutes base time
export const TIME_DECREASE_PER_LEVEL = 5;
export const BONUS_SLOT_1_COMBO = 4; // Combo needed to unlock slot 1
export const BONUS_SLOT_2_COMBO = 7; // Combo needed to unlock slot 2

// Multiplayer types
export interface MultiplayerPlayer {
  id: string;
  name: string;
  score: number;
  cardsRemaining: number;
  isReady: boolean;
  isHost: boolean;
  finished: boolean;
}

export interface MultiplayerRoom {
  code: string;
  players: MultiplayerPlayer[];
  gameSeed: number | null;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: number;
}

export interface MultiplayerGameState extends GameState {
  roomCode: string;
  playerId: string;
  opponents: MultiplayerPlayer[];
}

// WebSocket message types
export type WSMessageType = 
  | 'create_room'
  | 'join_room'
  | 'leave_room'
  | 'set_ready'
  | 'start_game'
  | 'game_update'
  | 'player_finished'
  | 'room_update'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
}
