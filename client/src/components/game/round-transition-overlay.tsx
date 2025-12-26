import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trophy, Skull, Flag } from "lucide-react";
import { ELIMINATION_START_ROUND, TOTAL_ROUNDS } from "@shared/schema";

interface RoundTransitionOverlayProps {
  roundNumber: number;
  isVisible: boolean;
  eliminatedPlayerName?: string;
}

export function RoundTransitionOverlay({
  roundNumber,
  isVisible,
  eliminatedPlayerName,
}: RoundTransitionOverlayProps) {
  const showEliminationWarning = roundNumber >= ELIMINATION_START_ROUND && roundNumber < TOTAL_ROUNDS;
  const isFinalRound = roundNumber === TOTAL_ROUNDS;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          data-testid="round-transition-overlay"
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center px-8 py-10 rounded-2xl bg-card/90 border border-card-border shadow-2xl max-w-md mx-4"
          >
            {/* Round Number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-6"
            >
              {isFinalRound ? (
                <Flag className="w-16 h-16 mx-auto text-primary mb-2" />
              ) : (
                <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-2" />
              )}
              <h1 className="text-4xl sm:text-5xl font-bold">
                Runde {roundNumber}
              </h1>
              {isFinalRound && (
                <p className="text-lg text-muted-foreground mt-2">Finale Runde!</p>
              )}
            </motion.div>

            {/* Elimination Warning */}
            {showEliminationWarning && !eliminatedPlayerName && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 text-destructive mb-4"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  Der letzte Spieler wird ausgeschieden!
                </p>
              </motion.div>
            )}

            {/* Eliminated Player Notice */}
            {eliminatedPlayerName && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg bg-muted"
              >
                <Skull className="w-10 h-10 text-muted-foreground" />
                <p className="font-medium">
                  <span className="text-foreground">{eliminatedPlayerName}</span>
                  <span className="text-muted-foreground"> wurde ausgeschieden</span>
                </p>
              </motion.div>
            )}

            {/* Loading dots */}
            <motion.div
              className="flex justify-center gap-2 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
