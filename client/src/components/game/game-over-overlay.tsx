import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Crown, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Player } from "@shared/schema";

interface GameOverOverlayProps {
  isVisible: boolean;
  winner: Player | null;
  players: Player[];
  onPlayAgain: () => void;
  onGoHome: () => void;
}

const rankColors = [
  "text-amber-500", // 1st
  "text-slate-400", // 2nd
  "text-amber-700", // 3rd
  "text-muted-foreground", // 4th
];

const rankBgColors = [
  "bg-amber-500/10 border-amber-500/30",
  "bg-slate-400/10 border-slate-400/30",
  "bg-amber-700/10 border-amber-700/30",
  "bg-muted/50 border-muted",
];

export function GameOverOverlay({
  isVisible,
  winner,
  players,
  onPlayAgain,
  onGoHome,
}: GameOverOverlayProps) {
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md overflow-y-auto py-8"
          data-testid="game-over-overlay"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -100 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-card border border-card-border rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
          >
            {/* Winner Header */}
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 px-6 py-8 text-center text-white">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <Crown className="w-16 h-16 mx-auto mb-3" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold mb-1"
              >
                Spiel vorbei!
              </motion.h1>
              {winner && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl text-white/90"
                  data-testid="winner-name"
                >
                  {winner.name} gewinnt!
                </motion.p>
              )}
            </div>

            {/* Scoreboard */}
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-center">Endstand</h2>
              <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${rankBgColors[index] || rankBgColors[3]}`}
                    data-testid={`final-rank-${index + 1}`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${rankColors[index]}`}>
                      {index === 0 ? (
                        <Trophy className="w-5 h-5" />
                      ) : (
                        <Medal className="w-5 h-5" />
                      )}
                    </div>
                    <span className="font-medium flex-1">{player.name}</span>
                    <span className={`font-bold text-lg ${rankColors[index]}`}>
                      {player.score}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onPlayAgain}
                className="flex-1"
                size="lg"
                data-testid="button-play-again"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Nochmal spielen
              </Button>
              <Button
                onClick={onGoHome}
                variant="outline"
                className="flex-1"
                size="lg"
                data-testid="button-go-home"
              >
                <Home className="w-5 h-5 mr-2" />
                Hauptmenü
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
