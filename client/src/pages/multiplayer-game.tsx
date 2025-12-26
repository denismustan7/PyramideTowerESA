import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  initGameWithSeed,
  playCard, 
  drawCard, 
  tickTimer, 
  canPlay, 
  canPlayOnBonusSlot,
  playCardOnBonusSlot,
  isCardPlayable,
  applyInvalidMovePenalty,
  getDiscardTop,
  getRank,
  hasValidMoves
} from "@/lib/gameEngine";
import { INVALID_MOVE_PENALTY } from "@shared/schema";
import type { GameState } from "@shared/schema";
import { TriPeaksTowers } from "@/components/game/tri-peaks-towers";
import { GameHUD } from "@/components/game/game-hud";
import { DrawArea } from "@/components/game/draw-area";
import { LiveScoreboard } from "@/components/game/live-scoreboard";
import { RoundTransitionOverlay } from "@/components/game/round-transition-overlay";
import { SpectatorBar } from "@/components/game/spectator-bar";

interface PlayerState {
  id: string;
  name: string;
  score: number;
  totalScore: number;
  cardsRemaining: number;
  finished: boolean;
  isEliminated: boolean;
  isReady?: boolean;
  eliminatedInRound?: number | null;
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

export default function MultiplayerGamePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  const params = new URLSearchParams(search);
  const roomCode = params.get('room') || '';
  const playerId = params.get('player') || '';
  const initialSeed = parseInt(params.get('seed') || '0', 10);
  const initialRound = parseInt(params.get('round') || '1', 10);
  const initialTotalRounds = parseInt(params.get('totalRounds') || '8', 10);
  const initialRoundTime = parseInt(params.get('roundTime') || '60', 10);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [shakeCardId, setShakeCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showPenalty, setShowPenalty] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalRanking, setFinalRanking] = useState<PlayerState[]>([]);
  
  const [currentRound, setCurrentRound] = useState(initialRound);
  const [totalRounds, setTotalRounds] = useState(initialTotalRounds);
  const [roundTimeLimit, setRoundTimeLimit] = useState(initialRoundTime);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundEndData, setRoundEndData] = useState<{
    round: number;
    standings: PlayerState[];
    nextRound: number;
    nextRoundTime: number;
    eliminatedId?: string;
    eliminatedName?: string;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  
  const [isEliminated, setIsEliminated] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectatingPlayerId, setSpectatingPlayerId] = useState<string | null>(null);
  const [spectatingPlayerName, setSpectatingPlayerName] = useState<string | null>(null);
  
  const [currentSeed, setCurrentSeed] = useState(initialSeed);
  const [hasFinishedRound, setHasFinishedRound] = useState(false);
  const [canSpectateWhileWaiting, setCanSpectateWhileWaiting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!initialSeed) {
      setLocation('/lobby');
      return;
    }

    // Initialize game with seed from URL (first round only)
    const initialState = initGameWithSeed(1, initialSeed);
    initialState.totalTime = initialRoundTime;
    initialState.timeRemaining = initialRoundTime;
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
    // Only run on mount - subsequent rounds are handled by round_started message
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWSMessage = (message: { type: string; payload?: any }) => {
    switch (message.type) {
      case 'opponent_update':
        setPlayers(prev => {
          const updated = [...message.payload.opponents];
          const currentPlayer = prev.find(p => p.id === playerId);
          if (currentPlayer) {
            return [currentPlayer, ...updated];
          }
          return updated;
        });
        break;
        
      case 'room_update':
        if (message.payload.room?.players) {
          setPlayers(message.payload.room.players);
          const readyIds = message.payload.room.players
            .filter((p: PlayerState) => p.isReady)
            .map((p: PlayerState) => p.id);
          setReadyPlayers(readyIds);
        }
        break;
        
      case 'player_finished':
        // Update the player's finished status in our local state
        setPlayers(prev => prev.map(p => 
          p.id === message.payload.playerId 
            ? { ...p, finished: true, score: message.payload.score }
            : p
        ));
        toast({
          title: `${message.payload.playerName} hat die Runde beendet!`,
        });
        break;
        
      case 'player_eliminated':
        if (message.payload.playerId === playerId) {
          setIsEliminated(true);
          setIsSpectating(true);
          toast({
            title: "Du wurdest eliminiert!",
            description: "Du kannst jetzt zuschauen.",
            variant: "destructive"
          });
        } else {
          toast({
            title: `${message.payload.playerName} wurde eliminiert!`,
            variant: "destructive"
          });
        }
        break;
        
      case 'round_end':
        setShowRoundEnd(true);
        setRoundEndData({
          round: message.payload.round,
          standings: message.payload.standings,
          nextRound: message.payload.nextRound,
          nextRoundTime: message.payload.nextRoundTime,
          eliminatedId: message.payload.eliminatedId,
          eliminatedName: message.payload.eliminatedName
        });
        setIsReady(false);
        break;
        
      case 'round_started':
        setShowRoundEnd(false);
        setRoundEndData(null);
        setCurrentRound(message.payload.currentRound);
        setTotalRounds(message.payload.totalRounds);
        setRoundTimeLimit(message.payload.roundTimeLimit);
        setIsReady(false);
        setReadyPlayers([]);
        setHasFinishedRound(false);
        setCanSpectateWhileWaiting(false);
        setIsSpectating(false);
        setSpectatingPlayerId(null);
        setSpectatingPlayerName(null);
        
        if (message.payload.isEliminated) {
          setIsEliminated(true);
          setIsSpectating(true);
          // Use the new seed even for spectators
          setCurrentSeed(message.payload.seed);
        } else {
          // Initialize new round with new seed from server
          const newSeed = message.payload.seed;
          setCurrentSeed(newSeed);
          const newState = initGameWithSeed(1, newSeed);
          newState.totalTime = message.payload.roundTimeLimit;
          newState.timeRemaining = message.payload.roundTimeLimit;
          setGameState(newState);
        }
        break;
        
      case 'spectator_update':
        setSpectatingPlayerId(message.payload.spectatingPlayerId);
        setSpectatingPlayerName(message.payload.playerName);
        break;
        
      case 'game_over':
        setGameOver(true);
        setShowRoundEnd(false);
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
    if (wsRef.current?.readyState === WebSocket.OPEN && !isEliminated) {
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
      
      setPlayers(prev => {
        const updated = prev.map(p => 
          p.id === playerId 
            ? { ...p, score: state.score, cardsRemaining: state.cardsRemaining }
            : p
        );
        return updated;
      });
    }
  }, [playerId, roomCode, isEliminated]);

  const sendRoundFinished = useCallback((state: GameState, finishReason: 'won' | 'time' | 'no_moves') => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !isEliminated && !hasFinishedRound) {
      setHasFinishedRound(true);
      setCanSpectateWhileWaiting(true);
      
      // Update own finished status in players list
      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, finished: true, score: state.score } : p
      ));
      
      wsRef.current.send(JSON.stringify({
        type: 'round_finished',
        payload: {
          playerId,
          roomCode,
          score: state.score,
          finishReason
        }
      }));
      
      // Show toast based on finish reason
      if (finishReason === 'won') {
        toast({
          title: "Alle Karten abgeräumt!",
          description: "Warte auf andere Spieler..."
        });
      } else if (finishReason === 'no_moves') {
        toast({
          title: "Keine Züge mehr möglich",
          description: "Warte auf andere Spieler..."
        });
      } else {
        toast({
          title: "Zeit abgelaufen!",
          description: "Warte auf andere Spieler..."
        });
      }
    }
  }, [playerId, roomCode, isEliminated, hasFinishedRound, toast]);

  // Timer effect - must be after sendRoundFinished is defined
  useEffect(() => {
    if (gameState?.phase === 'playing' && !isEliminated && !hasFinishedRound) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (!prev) return prev;
          const newState = tickTimer(prev);
          if (newState.phase !== 'playing' && newState.phase !== prev.phase) {
            clearInterval(timerRef.current!);
            sendRoundFinished(newState, 'time');
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
  }, [gameState?.phase, isEliminated, hasFinishedRound, sendRoundFinished]);

  const handleReadyForNextRound = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !isEliminated) {
      wsRef.current.send(JSON.stringify({
        type: 'ready_for_next_round',
        payload: { playerId, roomCode }
      }));
      setIsReady(true);
    }
  }, [playerId, roomCode, isEliminated]);

  const handleSpectatePlayer = useCallback((targetPlayerId: string) => {
    // Allow spectating if eliminated OR if finished round but waiting for others
    if (wsRef.current?.readyState === WebSocket.OPEN && (isEliminated || canSpectateWhileWaiting)) {
      wsRef.current.send(JSON.stringify({
        type: 'spectate_player',
        payload: { targetPlayerId }
      }));
      setIsSpectating(true);
      setSpectatingPlayerId(targetPlayerId);
      const targetPlayer = players.find(p => p.id === targetPlayerId);
      setSpectatingPlayerName(targetPlayer?.name || null);
    }
  }, [isEliminated, canSpectateWhileWaiting, players]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!gameState || gameState.phase !== 'playing' || isEliminated || hasFinishedRound) return;

    const cardIsPlayable = isCardPlayable(gameState, cardId);
    if (!cardIsPlayable) return;

    type SlotOption = 'main' | 'slot1' | 'slot2';
    const validSlots: SlotOption[] = [];
    
    if (canPlay(gameState, cardId)) {
      validSlots.push('main');
    }
    if (canPlayOnBonusSlot(gameState, cardId, 1)) {
      validSlots.push('slot1');
    }
    if (canPlayOnBonusSlot(gameState, cardId, 2)) {
      validSlots.push('slot2');
    }
    
    if (validSlots.length > 0) {
      const selectedSlot = validSlots[Math.floor(Math.random() * validSlots.length)];
      
      setGameState(prev => {
        if (!prev) return prev;
        let newState: GameState;
        if (selectedSlot === 'main') {
          newState = playCard(prev, cardId);
        } else if (selectedSlot === 'slot1') {
          newState = playCardOnBonusSlot(prev, cardId, 1);
        } else {
          newState = playCardOnBonusSlot(prev, cardId, 2);
        }
        sendGameUpdate(newState);
        
        // Check if won (all cards cleared)
        if (newState.phase === 'won') {
          sendRoundFinished(newState, 'won');
        }
        // Check if no valid moves left
        else if (!hasValidMoves(newState)) {
          sendRoundFinished(newState, 'no_moves');
        }
        
        return newState;
      });
      setSelectedCardId(null);
      return;
    }
    
    setGameState(prev => {
      if (!prev) return prev;
      const newState = applyInvalidMovePenalty(prev);
      sendGameUpdate(newState);
      return newState;
    });
    setShakeCardId(cardId);
    setShowPenalty(true);
    setTimeout(() => {
      setShakeCardId(null);
      setShowPenalty(false);
    }, 800);
  }, [gameState, sendGameUpdate, sendRoundFinished, isEliminated, hasFinishedRound]);

  const handleDraw = useCallback(() => {
    if (!gameState || gameState.phase !== 'playing' || isEliminated || hasFinishedRound) return;
    
    if (gameState.drawPile.length === 0) {
      // Check if there are any valid moves without drawing
      if (!hasValidMoves(gameState)) {
        sendRoundFinished(gameState, 'no_moves');
      } else {
        toast({
          title: "Stapel leer",
          description: "Keine Karten mehr zum Ziehen!",
          variant: "destructive"
        });
      }
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;
      const newState = drawCard(prev);
      sendGameUpdate(newState);
      
      // After drawing, check if still no valid moves
      if (!hasValidMoves(newState)) {
        sendRoundFinished(newState, 'no_moves');
      }
      
      return newState;
    });
  }, [gameState, toast, sendGameUpdate, sendRoundFinished, isEliminated, hasFinishedRound]);

  const handlePlayOnBonusSlot = useCallback((slotNumber: 1 | 2) => {
    if (!gameState || gameState.phase !== 'playing' || !selectedCardId || isEliminated || hasFinishedRound) return;

    if (canPlayOnBonusSlot(gameState, selectedCardId, slotNumber)) {
      setGameState(prev => {
        if (!prev) return prev;
        const newState = playCardOnBonusSlot(prev, selectedCardId, slotNumber);
        sendGameUpdate(newState);
        
        // Check if won (all cards cleared)
        if (newState.phase === 'won') {
          sendRoundFinished(newState, 'won');
        }
        // Check if no valid moves left
        else if (!hasValidMoves(newState)) {
          sendRoundFinished(newState, 'no_moves');
        }
        
        return newState;
      });
      setSelectedCardId(null);
    } else {
      setShakeCardId(selectedCardId);
      setTimeout(() => setShakeCardId(null), 300);
    }
  }, [gameState, selectedCardId, sendGameUpdate, sendRoundFinished, isEliminated, hasFinishedRound]);

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
  const activePlayers = players.filter(p => !p.isEliminated);

  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at center, #001428 0%, #000814 50%, #000510 100%)' }}
    >
      <MagicalParticles />

      {(isSpectating || canSpectateWhileWaiting) && (
        <SpectatorBar
          activePlayers={activePlayers.filter(p => !p.finished)}
          spectatingPlayerId={spectatingPlayerId}
          spectatingPlayerName={spectatingPlayerName}
          onSwitchPlayer={handleSpectatePlayer}
          isWaitingMode={hasFinishedRound && !isEliminated}
        />
      )}

      <GameHUD
        score={gameState.score}
        level={currentRound}
        combo={gameState.combo}
        timeRemaining={gameState.timeRemaining}
        totalTime={roundTimeLimit}
        rank={rank}
        onPause={() => {}}
        onHome={handleGoHome}
        isPaused={false}
      />

      <div className="absolute top-16 left-2 z-30 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded-full border border-cyan-500/30">
          <Users className="w-3 h-3 text-cyan-400" />
          <span className="text-xs text-cyan-400">{roomCode}</span>
        </div>
        <div 
          className="px-2 py-1 rounded-full border"
          style={{ 
            background: 'rgba(212, 175, 55, 0.1)',
            borderColor: 'rgba(212, 175, 55, 0.3)'
          }}
        >
          <span className="text-xs" style={{ color: '#D4AF37' }}>
            Runde {currentRound}/{totalRounds}
          </span>
        </div>
      </div>

      <LiveScoreboard
        players={players}
        currentPlayerId={playerId}
        currentRound={currentRound}
        totalRounds={totalRounds}
        canSpectate={isEliminated || canSpectateWhileWaiting}
        onSpectatePlayer={handleSpectatePlayer}
      />

      <AnimatePresence>
        {showPenalty && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 1.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
            data-testid="penalty-display"
          >
            <span 
              className="text-3xl font-bold"
              style={{ 
                color: '#ef4444',
                textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)'
              }}
            >
              -{INVALID_MOVE_PENALTY}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex-1 flex items-center justify-center p-2 relative z-10 overflow-hidden ${isSpectating ? 'mt-12' : ''}`}>
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
        maxTime={roundTimeLimit}
        onDraw={handleDraw}
        onPlayOnSlot={handlePlayOnBonusSlot}
        disabled={gameState.phase !== 'playing' || isEliminated || hasFinishedRound}
      />

      {/* Waiting overlay for players who finished but waiting for others */}
      <AnimatePresence>
        {hasFinishedRound && !isEliminated && !showRoundEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(0, 8, 20, 0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-6 rounded-lg pointer-events-auto"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(0, 20, 40, 0.95), rgba(0, 8, 20, 0.95))',
                border: '1px solid rgba(34, 211, 238, 0.3)'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 mx-auto mb-4 border-2 border-cyan-500 border-t-transparent rounded-full"
              />
              <h3 className="text-lg font-semibold text-cyan-300 mb-2">Warte auf Mitspieler...</h3>
              <p className="text-sm text-gray-400 mb-4">
                Deine Punkte: <span className="text-amber-300 font-bold">{gameState.score}</span>
              </p>
              <p className="text-xs text-cyan-400 mb-2">
                Klicke auf Namen in der Punktetabelle um zuzuschauen
              </p>
              {players.filter(p => !p.finished && !p.isEliminated && p.id !== playerId).length > 0 && (
                <p className="text-xs text-gray-500">
                  {players.filter(p => !p.finished && !p.isEliminated && p.id !== playerId).length} Spieler noch aktiv
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoundEnd && roundEndData && (
          <RoundTransitionOverlay
            round={roundEndData.round}
            standings={roundEndData.standings}
            currentPlayerId={playerId}
            readyPlayers={readyPlayers}
            eliminatedPlayerId={roundEndData.eliminatedId}
            eliminatedPlayerName={roundEndData.eliminatedName}
            nextRound={roundEndData.nextRound}
            nextRoundTime={roundEndData.nextRoundTime}
            onReady={handleReadyForNextRound}
            isReady={isReady}
          />
        )}
      </AnimatePresence>

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
              style={{ background: 'linear-gradient(to bottom, #001428, #000814)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400" />
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ color: '#D4AF37', textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
              >
                Spiel beendet!
              </h2>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {finalRanking.map((player, idx) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.isEliminated
                        ? 'bg-red-950/30 opacity-60'
                        : idx === 0 
                          ? 'bg-amber-500/20 border border-amber-500/50' 
                          : 'bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className={`text-lg font-bold ${
                          player.isEliminated ? 'text-red-500' : idx === 0 ? 'text-amber-400' : 'text-gray-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <span className={`${
                          player.isEliminated 
                            ? 'text-red-400 line-through' 
                            : player.id === playerId 
                              ? 'text-cyan-400' 
                              : 'text-white'
                        }`}>
                          {player.name}
                          {player.id === playerId && ' (Du)'}
                        </span>
                        {player.isEliminated && player.eliminatedInRound && (
                          <div className="text-xs text-red-500">
                            Eliminiert in Runde {player.eliminatedInRound}
                          </div>
                        )}
                      </div>
                    </div>
                    <span 
                      className={`font-bold ${player.isEliminated ? 'text-red-400' : 'text-amber-300'}`}
                    >
                      {player.totalScore.toLocaleString()}
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
