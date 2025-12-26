import type { LeaderboardEntry, InsertLeaderboard } from "@shared/schema";
import { getRank } from "@shared/schema";

export interface IStorage {
  // Leaderboard
  getLeaderboard(type: 'daily' | 'global', limit?: number): LeaderboardEntry[];
  addLeaderboardEntry(playerName: string, score: number): LeaderboardEntry;
}

export class MemStorage implements IStorage {
  private leaderboard: Map<number, LeaderboardEntry> = new Map();
  private nextId = 1;

  constructor() {}

  getLeaderboard(type: 'daily' | 'global', limit: number = 10): LeaderboardEntry[] {
    const today = new Date().toISOString().split('T')[0];
    
    let entries = Array.from(this.leaderboard.values());
    
    // Filter by type
    if (type === 'daily') {
      entries = entries.filter(e => e.date === today);
    }
    
    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);
    
    // Return top N
    return entries.slice(0, limit);
  }

  addLeaderboardEntry(playerName: string, score: number): LeaderboardEntry {
    const today = new Date().toISOString().split('T')[0];
    const rank = getRank(score);
    
    const entry: LeaderboardEntry = {
      id: this.nextId++,
      playerName,
      score,
      rank,
      date: today
    };
    
    this.leaderboard.set(entry.id, entry);
    return entry;
  }
}

export const storage = new MemStorage();
