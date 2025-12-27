import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Globe, Crown, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LeaderboardEntry } from "@shared/schema";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const rankIcons = [Crown, Trophy, Medal];
const rankColors = ["text-amber-400", "text-gray-300", "text-amber-600"];

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard'],
    enabled: isOpen
  });

  const getMedalBg = (rank: number) => {
    switch (rank) {
      case 0: return 'bg-gradient-to-r from-amber-500/20 to-amber-400/10 border-amber-500/30';
      case 1: return 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30';
      case 2: return 'bg-gradient-to-r from-amber-700/20 to-amber-600/10 border-amber-700/30';
      default: return 'bg-[#0a0e14]/50 border-gray-700/30';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          data-testid="leaderboard-modal"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0e14] border border-amber-500/30 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold text-amber-400">Bestenliste</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                data-testid="button-close-leaderboard"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Global Top 10 Header */}
            <div className="flex items-center gap-2 p-3 border-b border-amber-500/20">
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-medium">Top 10 - Multiplayer</span>
            </div>

            {/* Leaderboard List */}
            <div className="p-4 overflow-y-auto max-h-96">
              {isLoading ? (
                <div className="text-center text-gray-400 py-8">Laden...</div>
              ) : entries.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Noch keine Eintr\u00e4ge</p>
                  <p className="text-sm mt-1">Sei der Erste!</p>
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
                        className={`flex items-center gap-3 p-3 rounded-lg border ${getMedalBg(index)}`}
                        data-testid={`leaderboard-entry-${index}`}
                      >
                        {/* Rank */}
                        <div className={`flex items-center justify-center w-8 h-8 ${isTopThree ? rankColors[index] : 'text-gray-500'}`}>
                          {isTopThree ? (
                            <RankIcon className="w-5 h-5" />
                          ) : (
                            <span className="font-bold">#{index + 1}</span>
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{entry.playerName}</div>
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400/80">
                            {entry.rank}
                          </Badge>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className={`font-bold ${isTopThree ? rankColors[index] : 'text-amber-400'}`}>
                            {entry.score.toLocaleString()}
                          </div>
                        </div>
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
