import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Get leaderboard (daily or global)
  app.get("/api/leaderboard/:type", (req, res) => {
    const type = req.params.type as 'daily' | 'global';
    
    if (type !== 'daily' && type !== 'global') {
      return res.status(400).json({ error: "Invalid leaderboard type" });
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    const entries = storage.getLeaderboard(type, limit);
    res.json(entries);
  });

  // Submit score to leaderboard
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
