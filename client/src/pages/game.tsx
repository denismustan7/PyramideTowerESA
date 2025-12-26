import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Flag } from "lucide-react";
import { useGame } from "@/lib/gameContext";
import { PlayerGrid } from "@/components/game/player-grid";
import { RoundTransitionOverlay } from "@/components/game/round-transition-overlay";
import { GameOverOverlay } from "@/components/game/game-over-overlay";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { TOTAL_ROUNDS } from "@shared/schema";

export default function GamePage() {
  const [, setLocation] = useLocation();
  const { 
    gameState, 
    playerId, 
    room,
    playCard,
    leaveRoom 
  } = useGame();

  const [selectedActionCardId, setSelectedActionCardId] = useState<string | undefined>();
  const [selectedTowerCardId, setSelectedTowerCardId] = useState<string | undefined>();
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [lastEliminatedPlayer, setLastEliminatedPlayer] = useState<string | undefined>();

  // Redirect if no game
  useEffect(() => {
    if (!gameState && !room) {
      setLocation("/");
    }
  }, [gameState, room, setLocation]);

  // Handle round transitions
  useEffect(() => {
    if (gameState?.phase === 'round_transition') {
      setShowRoundTransition(true);
      
      // Find last eliminated player
      const eliminated = gameState.players.find(p => 
        p.isEliminated && !gameState.eliminatedPlayerIds.slice(0, -1).includes(p.id)
      );
      setLastEliminatedPlayer(eliminated?.name);

      const timeout = setTimeout(() => {
        setShowRoundTransition(false);
        setLastEliminatedPlayer(undefined);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [gameState?.phase, gameState?.round.roundNumber]);

  // Auto-play card when both selected
  useEffect(() => {
    if (selectedActionCardId && selectedTowerCardId) {
      playCard(selectedActionCardId, selectedTowerCardId);
      setSelectedActionCardId(undefined);
      setSelectedTowerCardId(undefined);
    }
  }, [selectedActionCardId, selectedTowerCardId, playCard]);

  const handleActionCardSelect = useCallback((cardId: string) => {
    setSelectedActionCardId(prev => prev === cardId ? undefined : cardId);
  }, []);

  const handleTowerCardSelect = useCallback((cardId: string) => {
    setSelectedTowerCardId(prev => prev === cardId ? undefined : cardId);
  }, []);

  const handlePlayAgain = () => {
    leaveRoom();
    setLocation("/");
  };

  const handleGoHome = () => {
    leaveRoom();
    setLocation("/");
  };

  if (!gameState || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isSpectator = currentPlayer?.isEliminated;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Game Header */}
      <header className="flex items-center justify-between gap-4 p-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold hidden sm:inline">Magic Tower</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Round Indicator */}
          <motion.div
            key={gameState.round.roundNumber}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Flag className="w-3.5 h-3.5 mr-1.5" />
              Runde {gameState.round.roundNumber}/{TOTAL_ROUNDS}
            </Badge>
          </motion.div>

          {/* Spectator Badge */}
          {isSpectator && (
            <Badge variant="outline" className="text-sm px-3 py-1">
              Zuschauer
            </Badge>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* Game Board */}
      <main className="flex-1 overflow-auto">
        <PlayerGrid
          players={gameState.players}
          round={gameState.round}
          currentPlayerId={playerId}
          selectedActionCardId={selectedActionCardId}
          selectedTowerCardId={selectedTowerCardId}
          onActionCardSelect={!isSpectator ? handleActionCardSelect : undefined}
          onTowerCardSelect={!isSpectator ? handleTowerCardSelect : undefined}
        />
      </main>

      {/* Round Transition Overlay */}
      <RoundTransitionOverlay
        roundNumber={gameState.round.roundNumber}
        isVisible={showRoundTransition}
        eliminatedPlayerName={lastEliminatedPlayer}
      />

      {/* Game Over Overlay */}
      <GameOverOverlay
        isVisible={gameState.phase === 'game_over'}
        winner={gameState.winner || null}
        players={gameState.players}
        onPlayAgain={handlePlayAgain}
        onGoHome={handleGoHome}
      />
    </div>
  );
}
