import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Trophy, HelpCircle, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeaderboardModal } from "@/components/game/leaderboard-modal";

function MagicalParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 4,
    size: 2 + Math.random() * 2,
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
            background: `radial-gradient(circle, rgba(34, 211, 238, 0.5), transparent)`,
          }}
          initial={{ bottom: -20, opacity: 0 }}
          animate={{
            bottom: ['0%', '100%'],
            opacity: [0, 0.6, 0],
            x: [0, Math.random() * 30 - 15],
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

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const handleSoloPlay = () => {
    setLocation("/game");
  };

  const handleMultiplayer = () => {
    setLocation("/lobby");
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative"
      style={{ 
        background: 'radial-gradient(ellipse at center, #001428 0%, #000814 50%, #000510 100%)'
      }}
    >
      <MagicalParticles />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34, 211, 238, 0.1), transparent)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1), transparent)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 
            className="text-4xl sm:text-5xl font-black mb-2 tracking-wider uppercase"
            style={{ 
              color: '#D4AF37',
              textShadow: '0 0 30px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.3), 2px 2px 0 #000',
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              letterSpacing: '0.1em'
            }}
            data-testid="text-title"
          >
            Pyramide Tower
          </h1>
          <p 
            className="text-gray-300 text-lg tracking-wide"
            style={{ 
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              fontSize: '0.7rem'
            }}
          >
            ESA-Solitär
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-4 w-full"
        >
          <Button
            size="lg"
            onClick={handleSoloPlay}
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-2 border-amber-400/50"
            style={{ boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}
            data-testid="button-solo"
          >
            <User className="w-6 h-6 mr-2" />
            Solo Spiel
          </Button>

          <Button
            size="lg"
            onClick={handleMultiplayer}
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white border-2 border-cyan-400/50"
            style={{ boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)' }}
            data-testid="button-multiplayer"
          >
            <Users className="w-6 h-6 mr-2" />
            Multiplayer
          </Button>

          <div className="flex gap-4 mt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowLeaderboard(true)}
              className="flex-1 h-12 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 bg-amber-500/5"
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
                  className="flex-1 h-12 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 bg-cyan-500/5"
                  data-testid="button-rules"
                >
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Regeln
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="max-w-lg border-amber-500/30 max-h-[80vh] overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(to bottom, #001020, #000814)' }}
              >
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle 
                    className="text-xl"
                    style={{ color: '#D4AF37' }}
                  >
                    Spielregeln
                  </DialogTitle>
                </DialogHeader>

                <div className="text-gray-300 space-y-4 overflow-y-auto flex-1 pr-2">
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
                    </ul>
                  </section>

                  <section className="border-t border-amber-500/20 pt-4">
                    <h3 className="text-amber-300 font-semibold mb-2">Multiplayer (1-6 Spieler)</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-cyan-300 text-sm font-medium mb-1">Runden & Zeit</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>10 Runden insgesamt</li>
                          <li>Runden 1-2: 75 Sekunden</li>
                          <li>Runden 3-5: 70 Sekunden</li>
                          <li>Ab Runde 6: -3 Sekunden pro Runde (67s, 64s, 61s, 58s, 55s)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-cyan-300 text-sm font-medium mb-1">Schwierigkeit</h4>
                        <p className="text-sm">Jede Runde hat eine zufallige Schwierigkeit (Einfach, Medium, Schwer) - fur alle Spieler gleich.</p>
                      </div>
                      <div>
                        <h4 className="text-cyan-300 text-sm font-medium mb-1">Elimination</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Eliminierung beginnt ab Runde (11 - Spieleranzahl)</li>
                          <li>Der letzte Platz wird jede Runde eliminiert</li>
                          <li>Am Ende spielt nur ein Spieler Runde 10</li>
                          <li>Eliminierte Spieler konnen zuschauen</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-cyan-300 text-sm font-medium mb-1">Speed Bonus</h4>
                        <p className="text-sm">+1000 Punkte fur den ersten Spieler, der alle Karten abraumt!</p>
                      </div>
                    </div>
                  </section>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

      </motion.div>

      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  );
}
