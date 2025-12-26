import { motion } from "framer-motion";
import { Trophy, Skull, Check, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StandingPlayer {
  id: string;
  name: string;
  score: number;
  totalScore: number;
  isEliminated: boolean;
}

interface RoundTransitionOverlayProps {
  round: number;
  standings: StandingPlayer[];
  currentPlayerId: string;
  readyPlayers: string[];
  eliminatedPlayerId?: string | null;
  eliminatedPlayerName?: string | null;
  nextRound: number;
  nextRoundTime: number;
  onReady: () => void;
  isReady: boolean;
}

export function RoundTransitionOverlay({
  round,
  standings,
  currentPlayerId,
  readyPlayers,
  eliminatedPlayerId,
  eliminatedPlayerName,
  nextRound,
  nextRoundTime,
  onReady,
  isReady
}: RoundTransitionOverlayProps) {
  const activePlayers = standings.filter(p => !p.isEliminated);
  const allReady = activePlayers.every(p => readyPlayers.includes(p.id));
  const readyCount = activePlayers.filter(p => readyPlayers.includes(p.id)).length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      data-testid="round-transition-overlay"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="text-center p-6 rounded-xl max-w-md w-full mx-4"
        style={{ background: 'linear-gradient(to bottom, #001428, #000814)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
      >
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: '#D4AF37', textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
        >
          Runde {round} beendet!
        </h2>
        
        {eliminatedPlayerId && eliminatedPlayerName && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-500/30"
          >
            <div className="flex items-center justify-center gap-2 text-red-400">
              <Skull className="w-5 h-5" />
              <span className="font-semibold">{eliminatedPlayerName} wurde eliminiert!</span>
            </div>
          </motion.div>
        )}
        
        <div className="text-sm text-gray-400 mb-4">
          <div className="flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" />
            <span>Nachste Runde: {nextRound}</span>
            <Clock className="w-3 h-3 ml-2" />
            <span>{nextRoundTime}s</span>
          </div>
        </div>
        
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {standings.map((player, idx) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isReady = readyPlayers.includes(player.id);
            
            return (
              <motion.div
                key={player.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.isEliminated 
                    ? 'bg-red-950/30 opacity-60'
                    : idx === 0 
                      ? 'bg-amber-500/20 border border-amber-500/50' 
                      : isCurrentPlayer
                        ? 'bg-cyan-900/30 border border-cyan-500/30'
                        : 'bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className={`text-lg font-bold ${
                      player.isEliminated 
                        ? 'text-red-500' 
                        : idx === 0 
                          ? 'text-amber-400' 
                          : 'text-gray-400'
                    }`}
                  >
                    {player.isEliminated ? <Skull className="w-5 h-5" /> : `#${idx + 1}`}
                  </span>
                  <div className="text-left">
                    <span className={`${
                      player.isEliminated 
                        ? 'text-red-400 line-through' 
                        : isCurrentPlayer 
                          ? 'text-cyan-400' 
                          : 'text-white'
                    }`}>
                      {player.name}
                      {isCurrentPlayer && !player.isEliminated && ' (Du)'}
                    </span>
                    {!player.isEliminated && (
                      <div className="text-xs text-gray-500">
                        +{player.score.toLocaleString()} diese Runde
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className={`font-bold ${
                      player.isEliminated ? 'text-red-400' : 'text-amber-300'
                    }`}
                  >
                    {player.totalScore.toLocaleString()}
                  </span>
                  {!player.isEliminated && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isReady ? 'bg-green-500' : 'bg-gray-600'
                    }`}>
                      {isReady && <Check className="w-3 h-3 text-white" />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="text-xs text-gray-500 mb-3">
          {readyCount}/{activePlayers.length} Spieler bereit
        </div>
        
        {standings.find(p => p.id === currentPlayerId)?.isEliminated ? (
          <div className="text-red-400 text-sm">
            Du wurdest eliminiert. Du kannst zuschauen.
          </div>
        ) : (
          <Button
            size="lg"
            onClick={onReady}
            disabled={isReady}
            className={`w-full ${
              isReady 
                ? 'bg-green-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-amber-600 to-amber-500'
            }`}
            data-testid="button-ready-next-round"
          >
            {isReady ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Bereit - Warte auf andere...
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                Bereit fur Runde {nextRound}
              </>
            )}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
