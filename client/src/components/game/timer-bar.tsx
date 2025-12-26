import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  timeRemaining: number;
  totalTime: number;
  isLowTime?: boolean;
  className?: string;
}

export function TimerBar({ timeRemaining, totalTime, isLowTime = false, className }: TimerBarProps) {
  const percentage = Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
  
  // Color transitions from cyan to red as time decreases
  const getBarColor = () => {
    if (isLowTime || percentage < 15) return 'bg-red-500';
    if (percentage < 30) return 'bg-amber-500';
    return 'bg-gradient-to-r from-cyan-400 to-cyan-300';
  };

  return (
    <div 
      className={cn(
        "w-full h-2 bg-gray-800/50 rounded-full overflow-hidden",
        className
      )}
      data-testid="timer-bar"
    >
      <motion.div
        className={cn(
          "h-full rounded-full",
          getBarColor()
        )}
        initial={{ width: '100%' }}
        animate={{ 
          width: `${percentage}%`,
          scale: isLowTime ? [1, 1.02, 1] : 1
        }}
        transition={{ 
          width: { duration: 0.5, ease: "linear" },
          scale: { duration: 0.5, repeat: isLowTime ? Infinity : 0 }
        }}
        style={{
          boxShadow: isLowTime 
            ? '0 0 15px rgba(239, 68, 68, 0.6)' 
            : '0 0 10px rgba(0, 245, 255, 0.4)'
        }}
        data-testid="timer-bar-fill"
      />
    </div>
  );
}
