import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  initGame, 
  playCard, 
  drawCard, 
  tickTimer, 
  canPlay, 
  getDiscardTop,
  hasValidMoves,
  calculateScoreBreakdown,
  getRank
} from "@/lib/gameEngine";
import type { GameState, Card } from "@shared/schema";
import { PyramidBoard } from "@/components/game/pyramid-board";
import { GameHUD } from "@/components/game/game-hud";
import { DrawArea } from "@/components/game/draw-area";
import { GameOverOverlay } from "@/components/game/game-over-overlay";
import { ComboIndicator } from "@/components/game/combo-indicator";

export default function GamePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(() => initGame(1));
  const [isPaused, setIsPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [shakeCardId, setShakeCardId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Submit score mutation
  const submitScore = useMutation({
    mutationFn: async ({ name, score }: { name: string; score: number }) => {
      return apiRequest('POST', '/api/leaderboard', { playerName: name, score });
    }
  });

  // Timer effect
  useEffect(() => {
    if (gameState.phase === 'playing' && !isPaused) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          const newState = tickTimer(prev);
          if (newState.phase !== 'playing') {
            clearInterval(timerRef.current!);
          }
          return newState;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState.phase, isPaused]);

  // Check for game over
  useEffect(() => {
    if (gameState.phase === 'won' || gameState.phase === 'lost') {
      setShowGameOver(true);
    }
  }, [gameState.phase]);

  // Handle card click
  const handleCardClick = useCallback((cardId: string) => {
    if (gameState.phase !== 'playing' || isPaused) return;

    if (canPlay(gameState, cardId)) {
      setGameState(prev => playCard(prev, cardId));
    } else {
      // Shake animation for invalid move
      setShakeCardId(cardId);
      setTimeout(() => setShakeCardId(null), 300);
    }
  }, [gameState, isPaused]);

  // Handle draw
  const handleDraw = useCallback(() => {
    if (gameState.phase !== 'playing' || isPaused) return;
    
    if (gameState.drawPile.length === 0) {
      toast({
        title: "Stapel leer",
        description: "Keine Karten mehr zum Ziehen!",
        variant: "destructive"
      });
      return;
    }

    setGameState(prev => drawCard(prev));
  }, [gameState, isPaused, toast]);

  // Handle pause toggle
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Handle restart
  const handleRestart = () => {
    setGameState(initGame(gameState.level));
    setShowGameOver(false);
    setIsPaused(false);
  };

  // Handle next level
  const handleNextLevel = () => {
    setGameState(initGame(gameState.level + 1));
    setShowGameOver(false);
    setIsPaused(false);
  };

  // Handle go home
  const handleGoHome = () => {
    setLocation("/");
  };

  // Handle submit score
  const handleSubmitScore = (name: string) => {
    setPlayerName(name);
    submitScore.mutate({ name, score: gameState.score });
  };

  const discardTop = getDiscardTop(gameState);
  const scoreBreakdown = calculateScoreBreakdown(gameState);
  const rank = getRank(gameState.score);

  return (
    <div className="min-h-screen bg-[#050a0f] flex flex-col overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* HUD */}
      <GameHUD
        score={gameState.score}
        level={gameState.level}
        combo={gameState.combo}
        timeRemaining={gameState.timeRemaining}
        totalTime={gameState.totalTime}
        rank={rank}
        onPause={togglePause}
        onHome={handleGoHome}
        isPaused={isPaused}
      />

      {/* Combo Indicator */}
      <ComboIndicator combo={gameState.combo} />

      {/* Pyramids */}
      <div className="flex-1 flex items-center justify-center p-2 relative z-10">
        <PyramidBoard
          pyramids={gameState.pyramids}
          discardTopValue={discardTop?.value || null}
          onCardClick={handleCardClick}
          shakeCardId={shakeCardId}
        />
      </div>

      {/* Draw Area */}
      <DrawArea
        drawPile={gameState.drawPile}
        discardPile={gameState.discardPile}
        onDraw={handleDraw}
        disabled={isPaused || gameState.phase !== 'playing'}
      />

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-amber-400 mb-6">Pausiert</h2>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={togglePause}
                  className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  data-testid="button-resume"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Weiter
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleRestart}
                  className="border-amber-500/50 text-amber-400"
                  data-testid="button-restart"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Neustart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGoHome}
                  className="border-gray-500/50 text-gray-400"
                  data-testid="button-home"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Menu
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <GameOverOverlay
        isVisible={showGameOver}
        won={gameState.phase === 'won'}
        score={gameState.score}
        scoreBreakdown={scoreBreakdown}
        rank={rank}
        level={gameState.level}
        onRestart={handleRestart}
        onNextLevel={gameState.phase === 'won' ? handleNextLevel : undefined}
        onHome={handleGoHome}
        onSubmitScore={handleSubmitScore}
        isSubmitting={submitScore.isPending}
      />
    </div>
  );
}
