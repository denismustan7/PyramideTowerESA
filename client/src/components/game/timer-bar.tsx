import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  timeRemaining: number;
  totalTime: number;
  className?: string;
}

export function TimerBar({ timeRemaining, totalTime, className }: TimerBarProps) {
  const percentage = Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
  
  const getBarGradient = () => {
    if (percentage < 20) {
      return 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
    if (percentage < 40) {
      return 'linear-gradient(90deg, #f59e0b, #d97706)';
    }
    return 'linear-gradient(90deg, #22d3ee, #06b6d4, #0891b2)';
  };

  const getGlowColor = () => {
    if (percentage < 20) return 'rgba(239, 68, 68, 0.8)';
    if (percentage < 40) return 'rgba(245, 158, 11, 0.6)';
    return 'rgba(34, 211, 238, 0.6)';
  };

  const isLowTime = percentage < 20;

  return (
    <div 
      className={cn(
        "w-full h-4 rounded-full overflow-hidden relative",
        "bg-gray-900/80 border border-gray-700/50",
        className
      )}
      data-testid="timer-bar"
    >
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `inset 0 2px 4px rgba(0,0,0,0.5)`
        }}
      />
      
      <motion.div
        className="h-full rounded-full relative"
        initial={{ width: '100%' }}
        animate={{ 
          width: `${percentage}%`,
        }}
        transition={{ duration: 0.5, ease: "linear" }}
        style={{
          background: getBarGradient(),
          boxShadow: `0 0 20px ${getGlowColor()}, 0 0 40px ${getGlowColor()}, inset 0 1px 2px rgba(255,255,255,0.3)`
        }}
        data-testid="timer-bar-fill"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
        
        {isLowTime && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ 
              opacity: [0.5, 1, 0.5],
              boxShadow: [
                `0 0 15px rgba(239, 68, 68, 0.6)`,
                `0 0 30px rgba(239, 68, 68, 1)`,
                `0 0 15px rgba(239, 68, 68, 0.6)`
              ]
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </motion.div>
    </div>
  );
}
