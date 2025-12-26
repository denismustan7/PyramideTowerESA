import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { Room, GameState, Player, ClientToServerEvent, ServerToClientEvent, LeaderboardEntry } from '@shared/schema';

interface GameContextType {
  // Connection state
  isConnected: boolean;
  
  // Player state
  playerId: string | null;
  playerName: string | null;
  
  // Room state
  room: Room | null;
  
  // Game state
  gameState: GameState | null;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  
  // Actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  playCard: (actionCardId: string, towerCardId: string) => void;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback((event: ClientToServerEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data: ServerToClientEvent = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room_created':
            setRoom(data.room);
            setPlayerId(data.playerId);
            break;
            
          case 'room_joined':
            setRoom(data.room);
            setPlayerId(data.playerId);
            break;
            
          case 'room_update':
            setRoom(data.room);
            break;
            
          case 'game_started':
            setGameState(data.gameState);
            break;
            
          case 'game_update':
            setGameState(data.gameState);
            break;
            
          case 'round_update':
            setGameState(prev => prev ? { ...prev, round: data.round } : null);
            break;
            
          case 'timer_tick':
            setGameState(prev => prev ? {
              ...prev,
              round: { ...prev.round, timeRemaining: data.timeRemaining }
            } : null);
            break;
            
          case 'combo_trigger':
            setGameState(prev => {
              if (!prev) return null;
              return {
                ...prev,
                players: prev.players.map(p => 
                  p.id === data.playerId ? { ...p, combo: data.combo } : p
                )
              };
            });
            break;
            
          case 'elimination_notice':
            setGameState(prev => {
              if (!prev) return null;
              return {
                ...prev,
                eliminatedPlayerIds: [...prev.eliminatedPlayerIds, data.playerId],
                players: prev.players.map(p =>
                  p.id === data.playerId ? { ...p, isEliminated: true } : p
                )
              };
            });
            break;
            
          case 'game_over':
            setGameState(prev => prev ? {
              ...prev,
              phase: 'game_over',
              winner: data.winner,
              players: data.finalScores
            } : null);
            break;
            
          case 'leaderboard_update':
            setLeaderboard(data.entries);
            break;
            
          case 'error':
            setError(data.message);
            break;
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    setPlayerName(name);
    send({ type: 'create_room', playerName: name });
  }, [send]);

  const joinRoom = useCallback((roomCode: string, name: string) => {
    setPlayerName(name);
    send({ type: 'join_room', roomCode, playerName: name });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'leave_room' });
    setRoom(null);
    setGameState(null);
  }, [send]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'set_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'start_game' });
  }, [send]);

  const playCard = useCallback((actionCardId: string, towerCardId: string) => {
    send({ type: 'play_card', actionCardId, towerCardId });
  }, [send]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <GameContext.Provider value={{
      isConnected,
      playerId,
      playerName,
      room,
      gameState,
      leaderboard,
      createRoom,
      joinRoom,
      leaveRoom,
      setReady,
      startGame,
      playCard,
      error,
      clearError
    }}>
      {children}
    </GameContext.Provider>
  );
}
