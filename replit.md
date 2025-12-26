# Magic Tower Multiplayer Game

## Overview
A Magic Tower-style solitaire card game for 1-4 players with real-time multiplayer support via WebSocket.

## Key Features
- **1-4 Players**: Create a room and invite friends with a room code
- **8 Rounds**: Each game consists of 8 rounds
- **Timer System**: 
  - Rounds 1-3: 60 seconds
  - Round 4: 55 seconds
  - Round 5: 50 seconds (decrease by 5s each round)
  - Timer displayed as green progress bar (no numbers)
- **Elimination System**:
  - Round 5: 4th place player eliminated
  - Round 6: 3rd place player eliminated
  - Round 7: 2nd place player eliminated
  - Eliminated players see skull icon but can spectate
- **Combo System**: Consecutive successful plays increase combo multiplier
- **Leaderboard**: Top 10 players with highest scores

## Project Structure

### Frontend (`client/src/`)
- `App.tsx` - Main app with routing and providers
- `lib/gameContext.tsx` - WebSocket connection and game state management
- `pages/`
  - `main-menu.tsx` - Home page with create/join game
  - `lobby.tsx` - Waiting room with player list and ready system
  - `game.tsx` - Main game view
- `components/game/`
  - `player-field.tsx` - Individual player's game area
  - `player-grid.tsx` - Grid layout for 2-4 players
  - `card-tower.tsx` - Stacked tower cards
  - `action-hand.tsx` - +1/-1 action cards
  - `game-card.tsx` - Card components (tower and action)
  - `timer-bar.tsx` - Green progress bar timer
  - `combo-badge.tsx` - Animated combo display
  - `elimination-overlay.tsx` - Skull overlay for eliminated players
  - `round-transition-overlay.tsx` - Round transition screen
  - `game-over-overlay.tsx` - Final scores and winner
  - `leaderboard-modal.tsx` - Top 10 champions
  - `room-code-card.tsx` - Room code display with share
  - `lobby-player-list.tsx` - Player list in lobby

### Backend (`server/`)
- `routes.ts` - WebSocket server and REST API
- `storage.ts` - In-memory storage for rooms, games, leaderboard

### Shared (`shared/`)
- `schema.ts` - Type definitions for Room, Player, Game, Cards, Events

## WebSocket Events

### Client to Server
- `create_room` - Create a new game room
- `join_room` - Join existing room by code
- `leave_room` - Leave current room
- `set_ready` - Toggle ready status
- `start_game` - Host starts the game
- `play_card` - Play an action card on a tower card
- `request_state` - Request current game state

### Server to Client
- `room_created` / `room_joined` / `room_update`
- `game_started` / `game_update`
- `timer_tick` - Every second countdown
- `combo_trigger` - Player combo activated
- `elimination_notice` - Player eliminated
- `game_over` - Game ended with winner
- `leaderboard_update` - Top 10 scores

## Game Constants
- `TOTAL_ROUNDS = 8`
- `BASE_ROUND_TIME = 60` seconds
- `TIME_DECREASE_PER_ROUND = 5` seconds (from round 4)
- `ELIMINATION_START_ROUND = 5`
- `MAX_PLAYERS = 4`
- `MIN_PLAYERS_TO_START = 1`

## Tech Stack
- React + Vite + TypeScript
- TanStack Query for data fetching
- Wouter for routing
- Framer Motion for animations
- Tailwind CSS + shadcn/ui
- Express + WebSocket (ws)
- In-memory storage
