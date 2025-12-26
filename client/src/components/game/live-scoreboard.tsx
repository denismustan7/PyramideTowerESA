import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Crown } from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  totalScore: number;
  cardsRemaining: number;
  finished: boolean;
  isEliminated: boolean;
}

interface LiveScoreboardProps {
  players: Player[];
  currentPlayerId: string;
  currentRound: number;
  totalRounds: number;
}

export function LiveScoreboard({ players, currentPlayerId, currentRound, totalRounds }: LiveScoreboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
  
  return (
    <div 
      className="fixed right-2 top-16 z-30 w-44 rounded-lg overflow-hidden"
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
          {sortedPlayers.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isLeader = index === 0 && !player.isEliminated;
            
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                  player.isEliminated 
                    ? 'bg-red-950/50 opacity-60' 
                    : isCurrentPlayer 
                      ? 'bg-cyan-900/40 border border-cyan-600/40' 
                      : 'bg-gray-800/40'
                }`}
                data-testid={`scoreboard-player-${player.id}`}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  <span 
                    className={`w-4 text-center font-bold ${
                      player.isEliminated ? 'text-red-500' : isLeader ? 'text-amber-400' : 'text-gray-500'
                    }`}
                  >
                    {player.isEliminated ? <Skull className="w-3 h-3" /> : `#${index + 1}`}
                  </span>
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
                    <Crown className="w-3 h-3 flex-shrink-0" style={{ color: '#D4AF37' }} />
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-1">
                  <div 
                    className={`font-semibold ${
                      player.isEliminated ? 'text-red-400' : 'text-amber-300'
                    }`}
                  >
                    {player.totalScore.toLocaleString()}
                  </div>
                  {!player.isEliminated && player.score > 0 && (
                    <div className="text-green-400 text-[10px]">
                      +{player.score.toLocaleString()}
                    </div>
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
