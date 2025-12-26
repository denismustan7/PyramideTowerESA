import { motion } from "framer-motion";
import { Home, Pause, Play, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimerBar } from "./timer-bar";
import type { RankName } from "@shared/schema";

interface GameHUDProps {
  score: number;
  level: number;
  combo: number;
  timeRemaining: number;
  totalTime: number;
  rank: RankName;
  onPause: () => void;
  onHome: () => void;
  isPaused: boolean;
}

export function GameHUD({
  score,
  level,
  combo,
  timeRemaining,
  totalTime,
  rank,
  onPause,
  onHome,
  isPaused
}: GameHUDProps) {
  return (
    <div className="relative z-20 p-3 bg-[#000814]/95 border-b border-amber-500/30">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onHome}
            className="text-gray-400 hover:text-white"
            data-testid="button-hud-home"
          >
            <Home className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPause}
            className="text-gray-400 hover:text-white"
            data-testid="button-hud-pause"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>
        </div>

        <motion.div
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          <Trophy className="w-5 h-5 text-amber-400" />
          <span 
            className="text-2xl font-bold"
            style={{ 
              color: '#D4AF37',
              textShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
            }}
            data-testid="text-score"
          >
            {score.toLocaleString()}
          </span>
        </motion.div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="border-cyan-500/50 text-cyan-400"
            data-testid="badge-level"
          >
            <Star className="w-3 h-3 mr-1" />
            Lvl {level}
          </Badge>
          <Badge 
            variant="outline" 
            className="border-amber-500/50 text-amber-400 hidden sm:flex"
            data-testid="badge-rank"
          >
            {rank}
          </Badge>
        </div>
      </div>

      <TimerBar 
        timeRemaining={timeRemaining} 
        totalTime={totalTime}
      />

      {combo > 1 && (
        <motion.div
          key={combo}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 -translate-y-full"
        >
          <span 
            className="text-3xl font-black"
            style={{
              color: combo >= 5 ? '#FFD700' : '#22d3ee',
              textShadow: combo >= 5 
                ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)' 
                : '0 0 15px rgba(34, 211, 238, 0.6)'
            }}
            data-testid="text-combo"
          >
            {combo}x
          </span>
        </motion.div>
      )}
    </div>
  );
}
