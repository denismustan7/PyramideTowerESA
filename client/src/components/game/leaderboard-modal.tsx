import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeaderboardEntry } from "@shared/schema";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
}

const rankIcons = [Crown, Trophy, Medal];
const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
const rankBgColors = [
  "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/40",
  "bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/40",
  "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-700/40",
];

export function LeaderboardModal({ isOpen, onClose, entries }: LeaderboardModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
          data-testid="leaderboard-modal"
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-card border border-card-border rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-7 h-7" />
                  <h2 className="text-xl font-bold">Top 10 Champions</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-primary-foreground hover:bg-white/20"
                  data-testid="button-close-leaderboard"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Entries */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Noch keine Einträge</p>
                  <p className="text-sm mt-1">Spiele ein Spiel um auf die Bestenliste zu kommen!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.slice(0, 10).map((entry, index) => {
                    const RankIcon = rankIcons[index] || Medal;
                    const isTopThree = index < 3;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors
                          ${isTopThree ? rankBgColors[index] : "bg-muted/30 border-border hover:bg-muted/50"}`}
                        data-testid={`leaderboard-entry-${index + 1}`}
                      >
                        {/* Rank */}
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full 
                          ${isTopThree ? rankColors[index] : "text-muted-foreground"}`}>
                          {isTopThree ? (
                            <RankIcon className="w-5 h-5" />
                          ) : (
                            <span className="font-bold text-sm">{index + 1}</span>
                          )}
                        </div>

                        {/* Name */}
                        <span className="font-medium flex-1 truncate" data-testid={`leaderboard-name-${index + 1}`}>
                          {entry.playerName}
                        </span>

                        {/* Score */}
                        <span className={`font-bold text-lg ${isTopThree ? rankColors[index] : "text-foreground"}`}
                          data-testid={`leaderboard-score-${index + 1}`}>
                          {entry.score}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
