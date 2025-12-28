# Pyramide Tower (ESA-Solitär)

## Overview
A Tri-Peaks Solitaire card game for 1-6 players with real-time multiplayer support via WebSocket. Features arcade-style design with the "Press Start 2P" font aesthetic.

## Key Features
- **1-6 Players**: Create a room and invite friends with a room code
- **10 Rounds**: All games consist of exactly 10 rounds
- **Timer System**: 
  - Rounds 1-2: 75 seconds
  - Rounds 3-5: 70 seconds
  - Round 6+: -3 seconds per round (67s, 64s, 61s, 58s, 55s)
  - Timer displayed as green progress bar (no numbers)
- **Dynamic Elimination System**:
  - Elimination starts at round (11 - playerCount)
  - 2 players: elimination at round 9
  - 3 players: elimination at round 8
  - 4 players: elimination at round 7
  - 5 players: elimination at round 6
  - 6 players: elimination at round 5
  - Last place eliminated each round until 1 player remains for round 10
  - Eliminated players can spectate
- **Speed Bonus**: +1000 points for first player to clear all cards in a round
- **Combo System**: Consecutive successful plays increase combo multiplier
- **Leaderboard**: Top 10 players with highest scores (cumulative across all rounds)

## Card Design
- Large centered rank (number/letter) for easy visibility
- Small rank + suit indicators in top-left and bottom-right corners
- Optimized for mobile portrait mode (iPhone 16 Pro primary target)

## Project Structure

### Frontend (`client/src/`)
- `App.tsx` - Main app with routing and providers
- `network/socket.ts` - Global WebSocket singleton (persists across route changes)
- `lib/api.ts` - REST API client for leaderboard
- `pages/`
  - `home.tsx` - Home page with solo/multiplayer options and rules
  - `lobby.tsx` - Waiting room with player list and ready system
  - `game.tsx` - Solo game view
  - `multiplayer-game.tsx` - Multiplayer game view
- `components/game/`
  - `tri-peaks-towers.tsx` - Three pyramid card layout
  - `playing-card.tsx` - Card component with large centered rank
  - `draw-area.tsx` - Draw pile and discard
  - `game-hud.tsx` - Score, timer, combo display
  - `live-scoreboard.tsx` - Real-time player scores
  - `round-transition-overlay.tsx` - Round transition screen
  - `spectator-bar.tsx` - Spectating controls for eliminated players
  - `leaderboard-modal.tsx` - Top 10 champions

### Backend (`server/`)
- `routes.ts` - WebSocket server and REST API
- `storage.ts` - In-memory storage for rooms, games
- `db.ts` - SQLite database for persistent leaderboard (data/leaderboard.db)

### Shared (`shared/`)
- `schema.ts` - Type definitions for Room, Player, Game, Cards, Events, and game constants

## WebSocket Events

### Client to Server
- `create_room` - Create a new game room
- `join_room` - Join existing room by code
- `leave_room` - Leave current room
- `set_ready` - Toggle ready status
- `start_game` - Host starts the game
- `game_update` - Send score/cardsRemaining updates
- `round_finished` - Player finished round (won/time/no_moves)
- `ready_for_next_round` - Ready for next round
- `spectate_player` - Switch spectating target
- `rejoin_game` - Reconnect to active game

### Server to Client
- `room_created` / `room_joined` / `room_update`
- `game_started` - Initial game start with seed
- `opponent_update` - Other players' scores
- `player_finished` - Player completed round
- `speed_bonus_awarded` - First to clear gets +1000 bonus
- `round_end` - Round ended with standings
- `round_started` - New round with new seed
- `player_eliminated` - Player eliminated from game
- `game_over` - Game ended with final ranking
- `spectator_update` - Spectating target changed
- `error` - Error messages

## Game Constants (shared/schema.ts)
- `TOTAL_ROUNDS = 10` - Fixed for all player counts
- `SPEED_BONUS = 1000` - Bonus for first to clear
- `MAX_PLAYERS = 6`
- `MIN_PLAYERS_TO_START = 1`
- Helper functions:
  - `getRoundTime(round)` - Get time limit for round
  - `getEliminationStartRound(playerCount)` - Calculate when elimination begins
  - `shouldEliminate(round, playerCount)` - Check if elimination happens this round

## Tech Stack
- React + Vite + TypeScript
- TanStack Query for data fetching
- Wouter for routing
- Framer Motion for animations
- Tailwind CSS + shadcn/ui
- Express + WebSocket (ws)
- SQLite (better-sqlite3) for persistent leaderboard
- In-memory storage for game rooms

## WebSocket Architecture
- **Singleton Pattern**: `client/src/network/socket.ts` maintains a single WebSocket connection
- Connection persists across page navigation (Lobby → Game)
- Simple getSocket() function returns existing socket or creates new one
- No socket.close() on component cleanup - socket survives route changes

## REST API Endpoints
- `POST /api/run` - Submit score `{ name: string, points: number }`
- `GET /api/leaderboard` - Get top 10 `[{ name, points }]`
