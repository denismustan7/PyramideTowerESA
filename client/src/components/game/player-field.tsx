import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Crown, Trophy } from "lucide-react";
import { TimerBar } from "./timer-bar";
import { ComboBadge } from "./combo-badge";
import { CardTower } from "./card-tower";
import { ActionHand } from "./action-hand";
import { EliminationOverlay } from "./elimination-overlay";
import type { Player, RoundState } from "@shared/schema";

interface PlayerFieldProps {
  player: Player;
  round: RoundState;
  isCurrentPlayer: boolean;
  isLeader: boolean;
  selectedActionCardId?: string;
  selectedTowerCardId?: string;
  onActionCardSelect?: (cardId: string) => void;
  onTowerCardSelect?: (cardId: string) => void;
}

export function PlayerField({
  player,
  round,
  isCurrentPlayer,
  isLeader,
  selectedActionCardId,
  selectedTowerCardId,
  onActionCardSelect,
  onTowerCardSelect,
}: PlayerFieldProps) {
  const isDisabled = player.isEliminated || !round.isActive;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative flex flex-col h-full rounded-xl p-3 sm:p-4",
        "bg-card border border-card-border",
        isCurrentPlayer && "ring-2 ring-primary/50",
        player.isEliminated && "opacity-60"
      )}
      data-testid={`player-field-${player.id}`}
    >
      {/* Header with player info */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isLeader && (
            <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
          )}
          <h3 className="font-bold text-lg truncate" data-testid={`player-name-${player.id}`}>
            {player.name}
            {isCurrentPlayer && <span className="text-muted-foreground text-sm ml-1">(Du)</span>}
          </h3>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-lg" data-testid={`player-score-${player.id}`}>
              {player.score}
            </span>
          </div>
        </div>
      </div>

      {/* Combo badge */}
      <ComboBadge combo={player.combo} />

      {/* Card Tower Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <CardTower
          cards={player.tower}
          selectedCardId={isCurrentPlayer ? selectedTowerCardId : undefined}
          onCardSelect={isCurrentPlayer ? onTowerCardSelect : undefined}
          isDisabled={isDisabled || !isCurrentPlayer}
        />
      </div>

      {/* Action Cards Hand */}
      <div className="mt-auto pt-2 border-t border-border">
        <ActionHand
          cards={player.hand}
          selectedCardId={isCurrentPlayer ? selectedActionCardId : undefined}
          onCardSelect={isCurrentPlayer ? onActionCardSelect : undefined}
          isDisabled={isDisabled || !isCurrentPlayer}
        />
      </div>

      {/* Timer Bar */}
      <div className="mt-3">
        <TimerBar
          timeRemaining={round.timeRemaining}
          totalTime={round.totalTime}
        />
      </div>

      {/* Elimination Overlay */}
      {player.isEliminated && (
        <EliminationOverlay playerName={player.name} />
      )}
    </motion.div>
  );
}
