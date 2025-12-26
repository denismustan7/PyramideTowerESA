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
  const isLowTime = timeRemaining <= 10;

  return (
    <div className="relative z-20 p-3 bg-[#0a0e14]/90 border-b border-amber-500/20">
      {/* Top row: Navigation and Score */}
      <div className="flex items-center justify-between gap-4 mb-2">
        {/* Left: Home and Pause */}
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

        {/* Center: Score */}
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

        {/* Right: Level and Rank */}
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

      {/* Timer Bar */}
      <TimerBar 
        timeRemaining={timeRemaining} 
        totalTime={totalTime}
        isLowTime={isLowTime}
      />
    </div>
  );
}
