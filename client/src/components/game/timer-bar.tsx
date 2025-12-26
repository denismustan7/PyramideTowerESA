import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  timeRemaining: number;
  totalTime: number;
  className?: string;
}

export function TimerBar({ timeRemaining, totalTime, className }: TimerBarProps) {
  const percentage = (timeRemaining / totalTime) * 100;
  const isUrgent = timeRemaining <= 10;

  return (
    <div 
      className={cn(
        "w-full h-3 bg-muted rounded-full overflow-hidden",
        className
      )}
      data-testid="timer-bar"
    >
      <motion.div
        className={cn(
          "h-full rounded-full transition-colors duration-300",
          isUrgent 
            ? "bg-gradient-to-r from-red-500 to-orange-500" 
            : "bg-gradient-to-r from-emerald-500 to-green-400"
        )}
        initial={{ width: "100%" }}
        animate={{ 
          width: `${percentage}%`,
          scale: isUrgent ? [1, 1.02, 1] : 1
        }}
        transition={{ 
          width: { duration: 0.3, ease: "linear" },
          scale: { duration: 0.5, repeat: isUrgent ? Infinity : 0 }
        }}
        data-testid="timer-bar-fill"
      />
    </div>
  );
}
