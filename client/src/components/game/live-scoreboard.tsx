import { motion, AnimatePresence } from "framer-motion";
import { Skull, Crown, ChevronUp, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Player {
  id: string;
  name: string;
  score: number;
  totalScore: number;
  cardsRemaining: number;
  finished: boolean;
  isEliminated: boolean;
}

interface PlayerWithRank extends Player {
  previousRank: number;
  currentRank: number;
  rankChange: 'up' | 'down' | 'same';
}

interface LiveScoreboardProps {
  players: Player[];
  currentPlayerId: string;
  currentRound: number;
  totalRounds: number;
  canSpectate?: boolean;
  onSpectatePlayer?: (playerId: string) => void;
}

export function LiveScoreboard({ 
  players, 
  currentPlayerId, 
  currentRound, 
  totalRounds,
  canSpectate = false,
  onSpectatePlayer
}: LiveScoreboardProps) {
  const previousRanksRef = useRef<Map<string, number>>(new Map());
  const [playersWithRanks, setPlayersWithRanks] = useState<PlayerWithRank[]>([]);
  
  useEffect(() => {
    // Sort by totalScore + current round score for live ranking
    const sortedPlayers = [...players].sort((a, b) => {
      const aTotal = a.totalScore + a.score;
      const bTotal = b.totalScore + b.score;
      return bTotal - aTotal;
    });
    
    const newPlayersWithRanks: PlayerWithRank[] = sortedPlayers.map((player, index) => {
      const currentRank = index + 1;
      const previousRank = previousRanksRef.current.get(player.id) ?? currentRank;
      
      let rankChange: 'up' | 'down' | 'same' = 'same';
      if (previousRank > currentRank) {
        rankChange = 'up';
      } else if (previousRank < currentRank) {
        rankChange = 'down';
      }
      
      return {
        ...player,
        previousRank,
        currentRank,
        rankChange
      };
    });
    
    setPlayersWithRanks(newPlayersWithRanks);
    
    const newRanks = new Map<string, number>();
    sortedPlayers.forEach((player, index) => {
      newRanks.set(player.id, index + 1);
    });
    previousRanksRef.current = newRanks;
  }, [players]);
  
  return (
    <div 
      className="fixed right-2 top-14 z-30 w-28 rounded overflow-hidden"
      style={{ background: 'rgba(0, 20, 40, 0.85)' }}
      data-testid="live-scoreboard"
    >
      <div className="p-1 space-y-0.5">
        <AnimatePresence mode="popLayout">
          {playersWithRanks.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isLeader = player.currentRank === 1 && !player.isEliminated;
            const showRankUp = player.rankChange === 'up';
            const showRankDown = player.rankChange === 'down';
            const liveTotal = player.totalScore + player.score;
            
            return (
              <motion.div
                key={player.id}
                layout
                layoutId={player.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: showRankUp ? [1, 1.03, 1] : 1
                }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ 
                  layout: { type: "spring", stiffness: 400, damping: 30 },
                  scale: { duration: 0.25 }
                }}
                className={`relative flex items-center justify-between px-1 py-0.5 rounded text-[10px] ${
                  player.isEliminated 
                    ? 'bg-red-950/40 opacity-50' 
                    : isCurrentPlayer 
                      ? 'bg-cyan-900/30' 
                      : ''
                }`}
                data-testid={`scoreboard-player-${player.id}`}
              >
                {showRankUp && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.5 }}
                    className="absolute -left-0.5 top-1/2 -translate-y-1/2"
                  >
                    <ChevronUp className="w-2 h-2 text-green-400" />
                  </motion.div>
                )}
                
                {showRankDown && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.5 }}
                    className="absolute -left-0.5 top-1/2 -translate-y-1/2"
                  >
                    <ChevronDown className="w-2 h-2 text-red-400" />
                  </motion.div>
                )}
                
                <div className="flex items-center gap-1 truncate flex-1 min-w-0">
                  <span className={`w-3 text-center font-bold text-[9px] ${
                    player.isEliminated 
                      ? 'text-red-500' 
                      : isLeader 
                        ? 'text-amber-400' 
                        : 'text-gray-500'
                  }`}>
                    {player.isEliminated ? <Skull className="w-2.5 h-2.5" /> : player.currentRank}
                  </span>
                  <button 
                    onClick={() => {
                      if (canSpectate && onSpectatePlayer && !isCurrentPlayer && !player.isEliminated) {
                        onSpectatePlayer(player.id);
                      }
                    }}
                    className={`truncate text-left max-w-[35px] ${
                      player.isEliminated 
                        ? 'text-red-400/70 line-through cursor-default' 
                        : isCurrentPlayer 
                          ? 'text-cyan-300 cursor-default' 
                          : canSpectate 
                            ? 'text-gray-300 hover:text-cyan-300 cursor-pointer' 
                            : 'text-gray-300 cursor-default'
                    }`}
                    disabled={!canSpectate || isCurrentPlayer || player.isEliminated}
                    data-testid={`spectate-player-${player.id}`}
                  >
                    {player.name.length > 4 ? player.name.slice(0, 4) + '.' : player.name}
                  </button>
                  {isLeader && !player.isEliminated && (
                    <Crown className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
                  )}
                </div>
                <motion.span 
                  className={`font-semibold text-right text-[9px] ${
                    player.isEliminated ? 'text-red-400/70' : 'text-amber-300'
                  }`}
                  key={liveTotal}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {liveTotal >= 1000 
                    ? (liveTotal / 1000).toFixed(1) + 'k' 
                    : liveTotal}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
