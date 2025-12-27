import type { LeaderboardEntry, InsertLeaderboard } from "@shared/schema";
import { getRank } from "@shared/schema";

export interface IStorage {
  // Leaderboard - global top 10 only
  getLeaderboard(limit?: number): LeaderboardEntry[];
  addLeaderboardEntry(playerName: string, score: number): LeaderboardEntry | null;
}

export class MemStorage implements IStorage {
  private leaderboard: LeaderboardEntry[] = [];
  private nextId = 1;

  constructor() {}

  getLeaderboard(limit: number = 10): LeaderboardEntry[] {
    // Return top 10 sorted by score descending
    return this.leaderboard.slice(0, limit);
  }

  addLeaderboardEntry(playerName: string, score: number): LeaderboardEntry | null {
    const rank = getRank(score);
    
    // Check if score qualifies for top 10
    if (this.leaderboard.length >= 10) {
      const lowestScore = this.leaderboard[this.leaderboard.length - 1].score;
      if (score <= lowestScore) {
        // Score doesn't beat any existing entry
        return null;
      }
    }
    
    const entry: LeaderboardEntry = {
      id: this.nextId++,
      playerName,
      score,
      rank,
      date: new Date().toISOString().split('T')[0]
    };
    
    // Add entry and sort
    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    if (this.leaderboard.length > 10) {
      this.leaderboard = this.leaderboard.slice(0, 10);
    }
    
    return entry;
  }
}

export const storage = new MemStorage();
