import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Play, Users, Trophy, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGame } from "@/lib/gameContext";
import { LeaderboardModal } from "@/components/game/leaderboard-modal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MainMenu() {
  const [, setLocation] = useLocation();
  const { createRoom, joinRoom, leaderboard, isConnected } = useGame();
  
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      createRoom(playerName.trim());
      setLocation("/lobby");
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      setLocation("/lobby");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">Magic Tower</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-card-border">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto mb-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
              </motion.div>
              <CardTitle className="text-3xl font-bold">Magic Tower</CardTitle>
              <p className="text-muted-foreground mt-2">
                Das Karten-Solitär für 1-4 Spieler
              </p>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Player Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Dein Spielername
                </label>
                <Input
                  placeholder="Name eingeben..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  data-testid="input-player-name"
                />
              </div>

              {/* Connection Status */}
              {!isConnected && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Verbindung wird hergestellt...
                </div>
              )}

              {/* Create Game Button */}
              <Button
                className="w-full"
                size="lg"
                disabled={!playerName.trim() || !isConnected}
                onClick={handleCreateRoom}
                data-testid="button-create-room"
              >
                <Play className="w-5 h-5 mr-2" />
                Neues Spiel erstellen
              </Button>

              {/* Join Game Dialog */}
              <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={!playerName.trim() || !isConnected}
                    data-testid="button-open-join-dialog"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Spiel beitreten
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Spiel beitreten</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Raumcode</label>
                      <Input
                        placeholder="Code eingeben..."
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-widest"
                        data-testid="input-room-code"
                      />
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!roomCode.trim()}
                      onClick={handleJoinRoom}
                      data-testid="button-join-room"
                    >
                      Beitreten
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Secondary Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowLeaderboard(true)}
                  data-testid="button-open-leaderboard"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Bestenliste
                </Button>

                <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="flex-1" data-testid="button-open-rules">
                      <Info className="w-4 h-4 mr-2" />
                      Spielregeln
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Spielregeln</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-1">Ziel</h4>
                        <p className="text-muted-foreground">
                          Sammle so viele Punkte wie möglich indem du Karten aufeinander legst, 
                          die genau um 1 höher oder niedriger sind.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Ablauf</h4>
                        <p className="text-muted-foreground">
                          Das Spiel besteht aus 8 Runden. Wähle eine +1 oder -1 Karte und 
                          lege sie auf eine passende Karte im Turm.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Kombos</h4>
                        <p className="text-muted-foreground">
                          Mehrere richtige Züge hintereinander ergeben einen Kombo-Multiplikator!
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Eliminierung</h4>
                        <p className="text-muted-foreground">
                          Ab Runde 5 wird der letzte Spieler eliminiert (aber kann weiter zuschauen). 
                          Ab Runde 4 wird die Zeit jede Runde um 5 Sekunden kürzer.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Timer</h4>
                        <p className="text-muted-foreground">
                          Runde 1-3: 60 Sekunden | Runde 4: 55s | Runde 5: 50s | 
                          Runde 6: 45s | Runde 7: 40s | Runde 8: 35s
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        entries={leaderboard}
      />
    </div>
  );
}
