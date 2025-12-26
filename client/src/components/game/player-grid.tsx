import { cn } from "@/lib/utils";
import { PlayerField } from "./player-field";
import type { Player, RoundState } from "@shared/schema";

interface PlayerGridProps {
  players: Player[];
  round: RoundState;
  currentPlayerId: string;
  selectedActionCardId?: string;
  selectedTowerCardId?: string;
  onActionCardSelect?: (cardId: string) => void;
  onTowerCardSelect?: (cardId: string) => void;
}

export function PlayerGrid({
  players,
  round,
  currentPlayerId,
  selectedActionCardId,
  selectedTowerCardId,
  onActionCardSelect,
  onTowerCardSelect,
}: PlayerGridProps) {
  // Find the leader (highest score among non-eliminated players)
  const activePlayers = players.filter(p => !p.isEliminated);
  const leaderId = activePlayers.length > 0
    ? activePlayers.reduce((prev, curr) => (curr.score > prev.score ? curr : prev)).id
    : null;

  // Determine grid layout based on player count
  const gridClass = cn(
    "grid gap-4 h-full w-full p-4",
    players.length === 1 && "grid-cols-1",
    players.length === 2 && "grid-cols-1 sm:grid-cols-2",
    players.length >= 3 && "grid-cols-1 sm:grid-cols-2"
  );

  return (
    <div className={gridClass} data-testid="player-grid">
      {players.map((player) => (
        <PlayerField
          key={player.id}
          player={player}
          round={round}
          isCurrentPlayer={player.id === currentPlayerId}
          isLeader={player.id === leaderId}
          selectedActionCardId={player.id === currentPlayerId ? selectedActionCardId : undefined}
          selectedTowerCardId={player.id === currentPlayerId ? selectedTowerCardId : undefined}
          onActionCardSelect={player.id === currentPlayerId ? onActionCardSelect : undefined}
          onTowerCardSelect={player.id === currentPlayerId ? onTowerCardSelect : undefined}
        />
      ))}
    </div>
  );
}
