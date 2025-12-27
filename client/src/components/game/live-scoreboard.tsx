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
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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

  // Mobile: horizontal compact bar at top
  if (isMobile) {
    return (
      <div 
        className="fixed left-1 right-1 top-12 z-30 rounded overflow-hidden"
        style={{ background: 'rgba(0, 20, 40, 0.9)' }}
        data-testid="live-scoreboard"
      >
        <div className="flex items-center justify-center gap-2 px-2 py-1 overflow-x-auto">
          <AnimatePresence mode="popLayout">
            {playersWithRanks.map((player) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              const isLeader = player.currentRank === 1 && !player.isEliminated;
              const liveTotal = player.totalScore + player.score;
              
              return (
                <motion.div
                  key={player.id}
                  layout
                  layoutId={player.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ layout: { type: "spring", stiffness: 400, damping: 30 } }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 ${
                    player.isEliminated 
                      ? 'bg-red-950/40 opacity-50' 
                      : isCurrentPlayer 
                        ? 'bg-cyan-900/40 border border-cyan-600/30' 
                        : 'bg-gray-800/30'
                  }`}
                  data-testid={`scoreboard-player-${player.id}`}
                >
                  <span className={`font-bold ${
                    player.isEliminated ? 'text-red-500' : isLeader ? 'text-amber-400' : 'text-gray-500'
                  }`}>
                    {player.isEliminated ? <Skull className="w-2.5 h-2.5" /> : player.currentRank}
                  </span>
                  {isLeader && !player.isEliminated && (
                    <Crown className="w-2.5 h-2.5" style={{ color: '#D4AF37' }} />
                  )}
                  <span className={`${
                    player.isEliminated ? 'text-red-400/70 line-through' : isCurrentPlayer ? 'text-cyan-300' : 'text-gray-300'
                  }`}>
                    {player.name.length > 3 ? player.name.slice(0, 3) : player.name}
                  </span>
                  <motion.span 
                    className={`font-semibold ${player.isEliminated ? 'text-red-400/70' : 'text-amber-300'}`}
                    key={liveTotal}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                  >
                    {liveTotal >= 1000 ? (liveTotal / 1000).toFixed(1) + 'k' : liveTotal}
                  </motion.span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }
  
  // Desktop: vertical sidebar
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
