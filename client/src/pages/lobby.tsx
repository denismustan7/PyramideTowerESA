import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Play, Check, Loader2, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/lib/gameContext";
import { RoomCodeCard } from "@/components/game/room-code-card";
import { LobbyPlayerList } from "@/components/game/lobby-player-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { MIN_PLAYERS_TO_START, MAX_PLAYERS } from "@shared/schema";

export default function LobbyPage() {
  const [, setLocation] = useLocation();
  const { 
    room, 
    playerId, 
    gameState,
    leaveRoom, 
    setReady, 
    startGame,
    error 
  } = useGame();

  // Redirect if no room
  useEffect(() => {
    if (!room && !error) {
      // Give a small delay in case room is being set
      const timeout = setTimeout(() => {
        if (!room) {
          setLocation("/");
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [room, error, setLocation]);

  // Redirect when game starts
  useEffect(() => {
    if (gameState && gameState.phase !== 'waiting') {
      setLocation("/game");
    }
  }, [gameState, setLocation]);

  const handleLeave = () => {
    leaveRoom();
    setLocation("/");
  };

  if (!room || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = room.hostId === playerId;
  const allReady = room.players.every(p => p.isReady);
  const canStart = room.players.length >= MIN_PLAYERS_TO_START && allReady;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" onClick={handleLeave} data-testid="button-leave-lobby">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Verlassen
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold">Lobby</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-4"
        >
          {/* Room Code */}
          <RoomCodeCard code={room.code} />

          {/* Player List Card */}
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Spieler ({room.players.length}/{MAX_PLAYERS})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LobbyPlayerList
                players={room.players}
                hostId={room.hostId}
                currentPlayerId={playerId}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            {/* Ready Button */}
            <Button
              variant={currentPlayer?.isReady ? "secondary" : "outline"}
              className="w-full"
              size="lg"
              onClick={() => setReady(!currentPlayer?.isReady)}
              data-testid="button-toggle-ready"
            >
              {currentPlayer?.isReady ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Bereit
                </>
              ) : (
                "Bereit machen"
              )}
            </Button>

            {/* Start Game Button (Host only) */}
            {isHost && (
              <Button
                className="w-full"
                size="lg"
                disabled={!canStart}
                onClick={startGame}
                data-testid="button-start-game"
              >
                <Play className="w-5 h-5 mr-2" />
                Spiel starten
              </Button>
            )}

            {!isHost && (
              <p className="text-center text-sm text-muted-foreground">
                Warte auf den Host um das Spiel zu starten...
              </p>
            )}

            {isHost && !canStart && (
              <p className="text-center text-sm text-muted-foreground">
                {room.players.length < MIN_PLAYERS_TO_START 
                  ? `Mindestens ${MIN_PLAYERS_TO_START} Spieler benötigt`
                  : "Alle Spieler müssen bereit sein"}
              </p>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
