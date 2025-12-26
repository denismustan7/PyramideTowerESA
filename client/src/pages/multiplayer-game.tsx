import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  initGameWithSeed,
  playCard, 
  drawCard, 
  tickTimer, 
  canPlay, 
  getDiscardTop,
  getRank
} from "@/lib/gameEngine";
import type { GameState, MultiplayerPlayer } from "@shared/schema";
import { TriPeaksTowers } from "@/components/game/tri-peaks-towers";
import { GameHUD } from "@/components/game/game-hud";
import { DrawArea } from "@/components/game/draw-area";
import { playCardOnBonusSlot } from "@/lib/gameEngine";

interface OpponentProgress {
  id: string;
  name: string;
  score: number;
  cardsRemaining: number;
  finished: boolean;
}

function MagicalParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
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

function OpponentPanel({ opponents }: { opponents: OpponentProgress[] }) {
  const totalCards = 28;
  
  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-30 space-y-2 w-32">
      {opponents.map((opp) => {
        const progress = ((totalCards - opp.cardsRemaining) / totalCards) * 100;
        return (
          <motion.div
            key={opp.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={`p-2 rounded-lg text-xs ${
              opp.finished 
                ? 'bg-amber-500/20 border border-amber-500/50' 
                : 'bg-gray-800/80 border border-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`truncate ${opp.finished ? 'text-amber-400' : 'text-gray-300'}`}>
                {opp.name}
              </span>
              {opp.finished && <Trophy className="w-3 h-3 text-amber-400" />}
            </div>
            <Progress 
              value={progress} 
              className="h-1.5 bg-gray-700"
            />
            <div className="flex justify-between mt-1 text-gray-500">
              <span>{opp.score.toLocaleString()}</span>
              <span>{opp.cardsRemaining} ubrig</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function MultiplayerGamePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  const params = new URLSearchParams(search);
  const roomCode = params.get('room') || '';
  const playerId = params.get('player') || '';
  const seed = parseInt(params.get('seed') || '0', 10);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [opponents, setOpponents] = useState<OpponentProgress[]>([]);
  const [shakeCardId, setShakeCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalRanking, setFinalRanking] = useState<OpponentProgress[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!seed) {
      setLocation('/lobby');
      return;
    }

    const initialState = initGameWithSeed(1, seed);
    setGameState(initialState);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'rejoin_game',
        payload: { roomCode, playerId }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWSMessage(message);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    wsRef.current = socket;

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [seed, roomCode, playerId, setLocation]);

  useEffect(() => {
    if (gameState?.phase === 'playing') {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (!prev) return prev;
          const newState = tickTimer(prev);
          if (newState.phase !== 'playing') {
            clearInterval(timerRef.current!);
            sendGameUpdate(newState);
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
  }, [gameState?.phase]);

  const handleWSMessage = (message: { type: string; payload?: any }) => {
    switch (message.type) {
      case 'opponent_update':
        setOpponents(message.payload.opponents);
        break;
      case 'player_finished':
        if (!winner) {
          setWinner(message.payload.playerName);
          toast({
            title: message.payload.playerId === playerId ? "Du hast gewonnen!" : `${message.payload.playerName} hat gewonnen!`,
            description: message.payload.playerId === playerId 
              ? "Herzlichen Gluckwunsch!" 
              : "Versuche es noch schneller!",
          });
        }
        break;
      case 'game_over':
        setGameOver(true);
        setFinalRanking(message.payload.ranking);
        break;
      case 'error':
        toast({
          title: "Fehler",
          description: message.payload.message,
          variant: "destructive"
        });
        break;
    }
  };

  const sendGameUpdate = useCallback((state: GameState) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_update',
        payload: {
          playerId,
          roomCode,
          score: state.score,
          cardsRemaining: state.cardsRemaining,
          finished: state.phase === 'won'
        }
      }));
    }
  }, [playerId, roomCode]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!gameState || gameState.phase !== 'playing') return;

    if (canPlay(gameState, cardId)) {
      setGameState(prev => {
        if (!prev) return prev;
        const newState = playCard(prev, cardId);
        sendGameUpdate(newState);
        return newState;
      });
    } else {
      setShakeCardId(cardId);
      setTimeout(() => setShakeCardId(null), 300);
    }
  }, [gameState, sendGameUpdate]);

  const handleDraw = useCallback(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    
    if (gameState.drawPile.length === 0) {
      toast({
        title: "Stapel leer",
        description: "Keine Karten mehr zum Ziehen!",
        variant: "destructive"
      });
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;
      const newState = drawCard(prev);
      sendGameUpdate(newState);
      return newState;
    });
  }, [gameState, toast, sendGameUpdate]);

  const handlePlayOnBonusSlot = useCallback((slotNumber: 1 | 2) => {
    if (!gameState || gameState.phase !== 'playing' || !selectedCardId) return;

    setGameState(prev => {
      if (!prev) return prev;
      const newState = playCardOnBonusSlot(prev, selectedCardId, slotNumber);
      sendGameUpdate(newState);
      return newState;
    });
    setSelectedCardId(null);
  }, [gameState, selectedCardId, sendGameUpdate]);

  const handleGoHome = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setLocation("/");
  };

  if (!gameState) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #001428 0%, #000814 50%, #000510 100%)' }}
      >
        <div className="text-cyan-400 text-xl">Lade Spiel...</div>
      </div>
    );
  }

  const discardTop = getDiscardTop(gameState);
  const rank = getRank(gameState.score);

  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at center, #001428 0%, #000814 50%, #000510 100%)' }}
    >
      <MagicalParticles />

      <GameHUD
        score={gameState.score}
        level={gameState.level}
        combo={gameState.combo}
        timeRemaining={gameState.timeRemaining}
        totalTime={gameState.totalTime}
        rank={rank}
        onPause={() => {}}
        onHome={handleGoHome}
        isPaused={false}
      />

      <div className="absolute top-16 left-2 z-30 flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded-full border border-cyan-500/30">
        <Users className="w-3 h-3 text-cyan-400" />
        <span className="text-xs text-cyan-400">{roomCode}</span>
      </div>

      <OpponentPanel opponents={opponents} />

      <div className="flex-1 flex items-center justify-center p-2 relative z-10 overflow-hidden">
        <TriPeaksTowers
          pyramid={gameState.pyramid}
          onCardClick={handleCardClick}
          selectedCardId={selectedCardId}
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
        disabled={gameState.phase !== 'playing'}
      />

      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center p-8 rounded-xl max-w-md w-full mx-4"
              style={{ background: 'linear-gradient(to bottom, #001428, #000814)' }}
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400" />
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ color: '#D4AF37', textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
              >
                Spiel beendet!
              </h2>

              <div className="space-y-3 mb-6">
                {finalRanking.map((player, idx) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      idx === 0 
                        ? 'bg-amber-500/20 border border-amber-500/50' 
                        : 'bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className={`text-lg font-bold ${
                          idx === 0 ? 'text-amber-400' : 'text-gray-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className={`${player.id === playerId ? 'text-cyan-400' : 'text-white'}`}>
                        {player.name}
                        {player.id === playerId && ' (Du)'}
                      </span>
                    </div>
                    <span 
                      className="font-bold"
                      style={{ color: idx === 0 ? '#D4AF37' : '#888' }}
                    >
                      {player.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={handleGoHome}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500"
                data-testid="button-back-home"
              >
                <Home className="w-5 h-5 mr-2" />
                Zuruck zum Menu
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
