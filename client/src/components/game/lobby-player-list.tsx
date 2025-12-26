import { motion } from "framer-motion";
import { User, Crown, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@shared/schema";

interface LobbyPlayerListProps {
  players: Player[];
  hostId: string;
  currentPlayerId: string;
}

export function LobbyPlayerList({ players, hostId, currentPlayerId }: LobbyPlayerListProps) {
  return (
    <div className="space-y-2" data-testid="lobby-player-list">
      {players.map((player, index) => {
        const isHost = player.id === hostId;
        const isCurrentPlayer = player.id === currentPlayerId;

        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors
              ${isCurrentPlayer ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"}`}
            data-testid={`lobby-player-${player.id}`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center
              ${isHost ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"}`}>
              {isHost ? (
                <Crown className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" data-testid={`lobby-player-name-${player.id}`}>
                  {player.name}
                </span>
                {isCurrentPlayer && (
                  <Badge variant="secondary" className="text-xs">Du</Badge>
                )}
                {isHost && (
                  <Badge variant="default" className="text-xs">Host</Badge>
                )}
              </div>
            </div>

            {/* Ready Status */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
              ${player.isReady 
                ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                : "bg-muted text-muted-foreground"}`}
            >
              {player.isReady ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Bereit</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Wartet</span>
                </>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Empty slots */}
      {Array.from({ length: 4 - players.length }).map((_, index) => (
        <motion.div
          key={`empty-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (players.length + index) * 0.1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border"
        >
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground/50">
            <User className="w-5 h-5" />
          </div>
          <span className="text-muted-foreground/50">Wartet auf Spieler...</span>
        </motion.div>
      ))}
    </div>
  );
}
