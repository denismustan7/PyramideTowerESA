import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, RotateCcw, Home, ChevronRight, Skull, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScoreBreakdown, RankName } from "@shared/schema";

interface GameOverOverlayProps {
  isVisible: boolean;
  won: boolean;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rank: RankName;
  level: number;
  onRestart: () => void;
  onNextLevel?: () => void;
  onHome: () => void;
  onSubmitScore: (name: string) => void;
  isSubmitting?: boolean;
}

export function GameOverOverlay({
  isVisible,
  won,
  score,
  scoreBreakdown,
  rank,
  level,
  onRestart,
  onNextLevel,
  onHome,
  onSubmitScore,
  isSubmitting = false
}: GameOverOverlayProps) {
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (playerName.trim()) {
      onSubmitScore(playerName.trim());
      setSubmitted(true);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md overflow-y-auto py-8 px-4"
          data-testid="game-over-overlay"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -100 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-[#0a0e14] border border-amber-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className={`relative px-6 py-8 text-center ${won 
              ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10' 
              : 'bg-gradient-to-br from-red-500/20 to-red-600/10'
            }`}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                {won ? (
                  <Crown className="w-16 h-16 mx-auto mb-3 text-amber-400" />
                ) : (
                  <Skull className="w-16 h-16 mx-auto mb-3 text-red-400" />
                )}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`text-3xl font-bold mb-1 ${won ? 'text-amber-400' : 'text-red-400'}`}
              >
                {won ? 'Level geschafft!' : 'Zeit abgelaufen!'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-400"
              >
                Level {level}
              </motion.p>
            </div>

            {/* Score Summary */}
            <div className="p-6 space-y-4">
              {/* Total Score */}
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">Gesamtpunktzahl</p>
                <p 
                  className="text-4xl font-bold"
                  style={{ 
                    color: '#D4AF37',
                    textShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
                  }}
                  data-testid="final-score"
                >
                  {score.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-medium">{rank}</span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-gray-800/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Basis-Punkte</span>
                  <span>{scoreBreakdown.baseScore.toLocaleString()}</span>
                </div>
                {scoreBreakdown.towerBonus > 0 && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Turm-Bonus</span>
                    <span>+{scoreBreakdown.towerBonus.toLocaleString()}</span>
                  </div>
                )}
                {scoreBreakdown.timeBonus > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Zeit-Bonus</span>
                    <span>+{scoreBreakdown.timeBonus.toLocaleString()}</span>
                  </div>
                )}
                {scoreBreakdown.perfectBonus > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Perfekt-Bonus</span>
                    <span>+{scoreBreakdown.perfectBonus.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Submit Score */}
              {!submitted ? (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm text-center">Trage dich in die Bestenliste ein:</p>
                  <div className="flex gap-2">
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Dein Name"
                      maxLength={20}
                      className="bg-gray-800/50 border-gray-700 text-white"
                      data-testid="input-player-name"
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={!playerName.trim() || isSubmitting}
                      className="bg-amber-500/20 text-amber-400 border border-amber-500/50"
                      data-testid="button-submit-score"
                    >
                      {isSubmitting ? '...' : 'OK'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-green-400 text-sm">
                  Punktzahl eingetragen!
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col gap-3">
              {won && onNextLevel && (
                <Button
                  onClick={onNextLevel}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white"
                  size="lg"
                  data-testid="button-next-level"
                >
                  <ChevronRight className="w-5 h-5 mr-2" />
                  Nachstes Level
                </Button>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={onRestart}
                  variant="outline"
                  className="flex-1 border-amber-500/50 text-amber-400"
                  size="lg"
                  data-testid="button-restart"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Neustart
                </Button>
                <Button
                  onClick={onHome}
                  variant="outline"
                  className="flex-1 border-gray-500/50 text-gray-400"
                  size="lg"
                  data-testid="button-home"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Menu
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
