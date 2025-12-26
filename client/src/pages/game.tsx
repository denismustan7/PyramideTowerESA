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
  canPlayOnBonusSlot,
  playCardOnBonusSlot,
  getDiscardTop,
  calculateScoreBreakdown,
  getRank
} from "@/lib/gameEngine";
import type { GameState } from "@shared/schema";
import { PyramidBoard } from "@/components/game/pyramid-board";
import { GameHUD } from "@/components/game/game-hud";
import { DrawArea } from "@/components/game/draw-area";
import { GameOverOverlay } from "@/components/game/game-over-overlay";

function MagicalParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 2 + Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(34, 211, 238, 0.6), transparent)`,
          }}
          initial={{ bottom: -20, opacity: 0 }}
          animate={{
            bottom: ['0%', '100%'],
            opacity: [0, 0.8, 0],
            x: [0, Math.random() * 40 - 20],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export default function GamePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(() => initGame(1));
  const [isPaused, setIsPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [shakeCardId, setShakeCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const submitScore = useMutation({
    mutationFn: async ({ name, score }: { name: string; score: number }) => {
      return apiRequest('POST', '/api/leaderboard', { playerName: name, score });
    }
  });

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

  useEffect(() => {
    if (gameState.phase === 'won' || gameState.phase === 'lost') {
      setShowGameOver(true);
    }
  }, [gameState.phase]);

  const handleCardClick = useCallback((cardId: string) => {
    if (gameState.phase !== 'playing' || isPaused) return;

    if (canPlay(gameState, cardId)) {
      setGameState(prev => playCard(prev, cardId));
      setSelectedCardId(null);
    } else if (gameState.bonusSlot1.isActive || gameState.bonusSlot2.isActive) {
      setSelectedCardId(cardId);
    } else {
      setShakeCardId(cardId);
      setTimeout(() => setShakeCardId(null), 300);
    }
  }, [gameState, isPaused]);

  const handlePlayOnBonusSlot = useCallback((slotNumber: 1 | 2) => {
    if (!selectedCardId || gameState.phase !== 'playing' || isPaused) return;

    if (canPlayOnBonusSlot(gameState, selectedCardId, slotNumber)) {
      setGameState(prev => playCardOnBonusSlot(prev, selectedCardId, slotNumber));
      setSelectedCardId(null);
    } else {
      setShakeCardId(selectedCardId);
      setTimeout(() => setShakeCardId(null), 300);
    }
  }, [gameState, selectedCardId, isPaused]);

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
    setSelectedCardId(null);
  }, [gameState, isPaused, toast]);

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleRestart = () => {
    setGameState(initGame(gameState.level));
    setShowGameOver(false);
    setIsPaused(false);
  };

  const handleNextLevel = () => {
    setGameState(initGame(gameState.level + 1));
    setShowGameOver(false);
    setIsPaused(false);
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  const handleSubmitScore = (name: string) => {
    submitScore.mutate({ name, score: gameState.score });
  };

  const discardTop = getDiscardTop(gameState);
  const scoreBreakdown = calculateScoreBreakdown(gameState);
  const rank = getRank(gameState.score);

  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ 
        background: 'radial-gradient(ellipse at center, #001428 0%, #000814 50%, #000510 100%)'
      }}
    >
      <MagicalParticles />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34, 211, 238, 0.08), transparent)' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08), transparent)' }}
        />
      </div>

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

      <div className="flex-1 flex items-center justify-center p-2 relative z-10">
        <PyramidBoard
          pyramids={gameState.pyramids}
          discardTopValue={discardTop?.value || null}
          onCardClick={handleCardClick}
          shakeCardId={shakeCardId}
        />
      </div>

      <DrawArea
        drawPile={gameState.drawPile}
        discardPile={gameState.discardPile}
        bonusSlot1={gameState.bonusSlot1}
        bonusSlot2={gameState.bonusSlot2}
        selectedCardId={selectedCardId}
        timeRemaining={gameState.timeRemaining}
        maxTime={60}
        onDraw={handleDraw}
        onPlayOnSlot={handlePlayOnBonusSlot}
        disabled={isPaused || gameState.phase !== 'playing'}
      />

      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <h2 
                className="text-4xl font-bold mb-8"
                style={{ 
                  color: '#D4AF37',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
                }}
              >
                Pausiert
              </h2>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={togglePause}
                  className="bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50 hover:bg-cyan-500/30"
                  data-testid="button-resume"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Weiter
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleRestart}
                  className="border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                  data-testid="button-restart"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Neustart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGoHome}
                  className="border-2 border-gray-500/50 text-gray-400 hover:bg-gray-500/20"
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
