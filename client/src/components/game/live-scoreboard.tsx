import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Crown, ChevronUp, ChevronDown } from "lucide-react";
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
}

export function LiveScoreboard({ players, currentPlayerId, currentRound, totalRounds }: LiveScoreboardProps) {
  const previousRanksRef = useRef<Map<string, number>>(new Map());
  const [playersWithRanks, setPlayersWithRanks] = useState<PlayerWithRank[]>([]);
  
  useEffect(() => {
    const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
    
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
    
    // Update previous ranks for next comparison
    const newRanks = new Map<string, number>();
    sortedPlayers.forEach((player, index) => {
      newRanks.set(player.id, index + 1);
    });
    previousRanksRef.current = newRanks;
  }, [players]);
  
  return (
    <div 
      className="fixed right-2 top-16 z-30 w-48 rounded-lg overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, rgba(0, 20, 40, 0.95), rgba(0, 8, 20, 0.95))' }}
      data-testid="live-scoreboard"
    >
      <div 
        className="px-3 py-2 border-b border-cyan-900/50 flex items-center justify-between"
        style={{ background: 'rgba(212, 175, 55, 0.1)' }}
      >
        <span className="text-xs font-semibold" style={{ color: '#D4AF37' }}>
          Runde {currentRound}/{totalRounds}
        </span>
        <Trophy className="w-3 h-3" style={{ color: '#D4AF37' }} />
      </div>
      
      <div className="p-1.5 space-y-1">
        <AnimatePresence mode="popLayout">
          {playersWithRanks.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isLeader = player.currentRank === 1 && !player.isEliminated;
            const showRankUp = player.rankChange === 'up';
            const showRankDown = player.rankChange === 'down';
            
            return (
              <motion.div
                key={player.id}
                layout
                layoutId={player.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: showRankUp ? [1, 1.02, 1] : 1
                }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ 
                  layout: { type: "spring", stiffness: 350, damping: 25 },
                  scale: { duration: 0.3 }
                }}
                className={`relative flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                  player.isEliminated 
                    ? 'bg-red-950/50 opacity-60' 
                    : isCurrentPlayer 
                      ? 'bg-cyan-900/40 border border-cyan-600/40' 
                      : 'bg-gray-800/40'
                }`}
                data-testid={`scoreboard-player-${player.id}`}
              >
                {showRankUp && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: [0, 1, 0], y: [-5, -10, -15] }}
                    transition={{ duration: 0.8 }}
                    className="absolute -left-1 top-1/2 -translate-y-1/2"
                  >
                    <ChevronUp className="w-3 h-3 text-green-400" />
                  </motion.div>
                )}
                
                {showRankDown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: [0, 1, 0], y: [5, 10, 15] }}
                    transition={{ duration: 0.8 }}
                    className="absolute -left-1 top-1/2 -translate-y-1/2"
                  >
                    <ChevronDown className="w-3 h-3 text-red-400" />
                  </motion.div>
                )}
                
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  <motion.span 
                    className={`w-5 text-center font-bold text-[10px] ${
                      player.isEliminated 
                        ? 'text-red-500' 
                        : isLeader 
                          ? 'text-amber-400' 
                          : 'text-gray-500'
                    }`}
                    animate={showRankUp ? { 
                      color: ['#22c55e', '#22c55e', player.isEliminated ? '#ef4444' : isLeader ? '#fbbf24' : '#6b7280']
                    } : {}}
                    transition={{ duration: 0.8 }}
                  >
                    {player.isEliminated ? <Skull className="w-3 h-3" /> : `#${player.currentRank}`}
                  </motion.span>
                  <span 
                    className={`truncate ${
                      player.isEliminated 
                        ? 'text-red-400 line-through' 
                        : isCurrentPlayer 
                          ? 'text-cyan-300' 
                          : 'text-gray-300'
                    }`}
                  >
                    {player.name}
                    {isCurrentPlayer && !player.isEliminated && ' (Du)'}
                  </span>
                  {isLeader && !player.isEliminated && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <Crown className="w-3 h-3 flex-shrink-0" style={{ color: '#D4AF37' }} />
                    </motion.div>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-1">
                  <motion.div 
                    className={`font-semibold ${
                      player.isEliminated ? 'text-red-400' : 'text-amber-300'
                    }`}
                    animate={showRankUp ? {
                      scale: [1, 1.15, 1],
                      color: ['#86efac', '#86efac', player.isEliminated ? '#f87171' : '#fcd34d']
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {player.totalScore.toLocaleString()}
                  </motion.div>
                  {!player.isEliminated && player.score > 0 && (
                    <motion.div 
                      className="text-green-400 text-[10px]"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      +{player.score.toLocaleString()}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
