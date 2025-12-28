import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'leaderboard.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_points ON runs(points DESC)`);

export interface RunEntry {
  id: number;
  name: string;
  points: number;
  created_at: string;
}

export function addRun(name: string, points: number): RunEntry {
  const stmt = db.prepare('INSERT INTO runs (name, points) VALUES (?, ?)');
  const result = stmt.run(name, points);
  
  return {
    id: result.lastInsertRowid as number,
    name,
    points,
    created_at: new Date().toISOString()
  };
}

export function getLeaderboard(limit: number = 10): { name: string; points: number }[] {
  const stmt = db.prepare('SELECT name, points FROM runs ORDER BY points DESC LIMIT ?');
  return stmt.all(limit) as { name: string; points: number }[];
}

export function closeDb() {
  db.close();
}

export default db;
