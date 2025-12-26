import { motion } from "framer-motion";
import { Eye, ChevronLeft, ChevronRight, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivePlayer {
  id: string;
  name: string;
  score: number;
  totalScore: number;
}

interface SpectatorBarProps {
  activePlayers: ActivePlayer[];
  spectatingPlayerId: string | null;
  spectatingPlayerName: string | null;
  onSwitchPlayer: (playerId: string) => void;
}

export function SpectatorBar({ 
  activePlayers, 
  spectatingPlayerId, 
  spectatingPlayerName,
  onSwitchPlayer 
}: SpectatorBarProps) {
  const currentIndex = activePlayers.findIndex(p => p.id === spectatingPlayerId);
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      onSwitchPlayer(activePlayers[currentIndex - 1].id);
    } else if (activePlayers.length > 0) {
      onSwitchPlayer(activePlayers[activePlayers.length - 1].id);
    }
  };
  
  const handleNext = () => {
    if (currentIndex < activePlayers.length - 1) {
      onSwitchPlayer(activePlayers[currentIndex + 1].id);
    } else if (activePlayers.length > 0) {
      onSwitchPlayer(activePlayers[0].id);
    }
  };
  
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-4 py-2 px-4"
      style={{ 
        background: 'linear-gradient(to bottom, rgba(127, 29, 29, 0.9), rgba(80, 20, 20, 0.8))',
        borderBottom: '2px solid rgba(239, 68, 68, 0.5)'
      }}
      data-testid="spectator-bar"
    >
      <div className="flex items-center gap-2 text-red-300">
        <Skull className="w-5 h-5" />
        <span className="font-semibold">ELIMINIERT</span>
      </div>
      
      <div className="h-6 w-px bg-red-500/30" />
      
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-gray-300" />
        <span className="text-gray-300 text-sm">Zuschauer-Modus:</span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handlePrevious}
          className="text-white hover:bg-white/10"
          data-testid="button-spectate-prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div 
          className="px-4 py-1 rounded bg-gray-800/50 min-w-32 text-center"
          data-testid="text-spectating-player"
        >
          <span className="text-cyan-300 font-medium">
            {spectatingPlayerName || "Wahle Spieler..."}
          </span>
        </div>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleNext}
          className="text-white hover:bg-white/10"
          data-testid="button-spectate-next"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="h-6 w-px bg-red-500/30" />
      
      <div className="flex gap-1">
        {activePlayers.map((player) => (
          <Button
            key={player.id}
            size="sm"
            variant={player.id === spectatingPlayerId ? "default" : "outline"}
            onClick={() => onSwitchPlayer(player.id)}
            className={`text-xs ${
              player.id === spectatingPlayerId 
                ? 'bg-cyan-600' 
                : 'border-gray-600 text-gray-300'
            }`}
            data-testid={`button-spectate-${player.id}`}
          >
            {player.name}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
