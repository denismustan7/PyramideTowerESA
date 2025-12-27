import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Crown, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  
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
    
    const newRanks = new Map<string, number>();
    sortedPlayers.forEach((player, index) => {
      newRanks.set(player.id, index + 1);
    });
    previousRanksRef.current = newRanks;
  }, [players]);

  const currentPlayer = playersWithRanks.find(p => p.id === currentPlayerId);
  
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed right-2 top-14 z-30 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
        style={{ background: 'rgba(0, 20, 40, 0.85)' }}
        data-testid="scoreboard-expand"
      >
        <Trophy className="w-3 h-3 text-amber-400" />
        <span className="text-gray-300">
          #{currentPlayer?.currentRank || '-'}
        </span>
        <span className="text-amber-300 font-semibold">
          {(currentPlayer?.totalScore || 0).toLocaleString()}
        </span>
        <ChevronRight className="w-3 h-3 text-gray-500" />
      </button>
    );
  }
  
  return (
    <div 
      className="fixed right-2 top-14 z-30 w-32 rounded overflow-hidden"
      style={{ background: 'rgba(0, 20, 40, 0.9)' }}
      data-testid="live-scoreboard"
    >
      <button 
        onClick={() => setIsExpanded(false)}
        className="w-full flex items-center justify-between px-1.5 py-0.5 text-[9px] text-gray-400 hover:text-gray-200 transition-colors border-b border-gray-700/50"
        data-testid="scoreboard-collapse"
      >
        <div className="flex items-center gap-1">
          <Trophy className="w-2.5 h-2.5 text-amber-400" />
          <span>Rangliste</span>
        </div>
        <span className="text-[8px]">minimieren</span>
      </button>
      <div className="p-1 space-y-0.5">
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
                initial={{ opacity: 0, x: 10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: showRankUp ? [1, 1.02, 1] : 1
                }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ 
                  layout: { type: "spring", stiffness: 350, damping: 25 },
                  scale: { duration: 0.3 }
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
                    transition={{ duration: 0.6 }}
                    className="absolute -left-0.5 top-1/2 -translate-y-1/2"
                  >
                    <ChevronUp className="w-2 h-2 text-green-400" />
                  </motion.div>
                )}
                
                {showRankDown && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.6 }}
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
                    className={`truncate text-left max-w-[40px] ${
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
                    {player.name.length > 5 ? player.name.slice(0, 5) + '.' : player.name}
                  </button>
                  {isLeader && !player.isEliminated && (
                    <Crown className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
                  )}
                </div>
                <motion.span 
                  className={`font-semibold text-right ${
                    player.isEliminated ? 'text-red-400/70' : 'text-amber-300'
                  }`}
                  animate={showRankUp ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {player.totalScore >= 1000 
                    ? (player.totalScore / 1000).toFixed(1) + 'k' 
                    : player.totalScore}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
