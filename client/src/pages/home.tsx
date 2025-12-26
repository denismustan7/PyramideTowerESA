import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Trophy, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeaderboardModal } from "@/components/game/leaderboard-modal";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const handlePlay = () => {
    setLocation("/game");
  };

  return (
    <div className="min-h-screen bg-[#050a0f] flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full"
      >
        {/* Logo/Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 
            className="text-5xl font-bold mb-2"
            style={{ 
              color: '#D4AF37',
              textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)'
            }}
            data-testid="text-title"
          >
            Magic Tower
          </h1>
          <p className="text-gray-400 text-lg">Tri-Peaks Solitaire</p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-4 w-full"
        >
          <Button
            size="lg"
            onClick={handlePlay}
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-2 border-amber-400/50"
            data-testid="button-play"
          >
            <Play className="w-6 h-6 mr-2" />
            Spielen
          </Button>

          <div className="flex gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowLeaderboard(true)}
              className="flex-1 h-12 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              data-testid="button-leaderboard"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Bestenliste
            </Button>

            <Dialog open={showRules} onOpenChange={setShowRules}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  data-testid="button-rules"
                >
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Regeln
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0e14] border-amber-500/30 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-amber-400 text-xl">Spielregeln</DialogTitle>
                </DialogHeader>
                <div className="text-gray-300 space-y-4">
                  <section>
                    <h3 className="text-amber-300 font-semibold mb-2">Ziel</h3>
                    <p>Raume alle Karten von den drei Pyramiden ab, bevor die Zeit ablauft.</p>
                  </section>
                  <section>
                    <h3 className="text-amber-300 font-semibold mb-2">Spielweise</h3>
                    <p>Tippe auf eine Karte, deren Wert um 1 hoher oder niedriger ist als die Karte auf dem Ablagestapel.</p>
                    <p className="text-sm text-gray-400 mt-1">Beispiel: Auf eine 7 darf eine 6 oder 8 gelegt werden.</p>
                  </section>
                  <section>
                    <h3 className="text-amber-300 font-semibold mb-2">Spezialregeln</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Das Ass verbindet Konig und 2</li>
                      <li>Verdeckte Karten werden aufgedeckt, wenn beide darunter liegenden Karten entfernt wurden</li>
                      <li>Ziehe vom Stapel, wenn kein Zug moglich ist (setzt Combo zuruck)</li>
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-amber-300 font-semibold mb-2">Punkte</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Combo-Multiplikator: Jede Karte ohne Ziehen erhoht den Multiplikator</li>
                      <li>Turm-Bonus: Extra Punkte fur jeden geleerten Turm</li>
                      <li>Zeit-Bonus: Restzeit wird in Punkte umgewandelt</li>
                      <li>Perfekt-Bonus: Alle Karten ohne leeren Stapel = massive Bonuspunkte</li>
                    </ul>
                  </section>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Rank Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <Card className="bg-[#0a0e14]/80 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-400/80">Range</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Novize</span>
                <span>0 - 10.000</span>
              </div>
              <div className="flex justify-between">
                <span>Zauberlehrling</span>
                <span>10.001 - 30.000</span>
              </div>
              <div className="flex justify-between">
                <span>Magier</span>
                <span>30.001 - 70.000</span>
              </div>
              <div className="flex justify-between">
                <span>Erzmagier</span>
                <span>70.001 - 150.000</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Turmwachter</span>
                <span>150.000+</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Leaderboard Modal */}
      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  );
}
