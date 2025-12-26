import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Card, Suit } from "@shared/schema";

interface PlayingCardProps {
  card: Card;
  isPlayable?: boolean;
  isCovered?: boolean;
  isShaking?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const suitSymbols: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

const sizeClasses = {
  sm: 'w-12 h-16',
  md: 'w-16 h-22',
  lg: 'w-20 h-28',
};

const valueSizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

const suitSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function PlayingCard({ 
  card, 
  isPlayable = false, 
  isCovered = false,
  isShaking = false,
  onClick,
  size = 'md'
}: PlayingCardProps) {
  
  if (!card.isFaceUp) {
    return (
      <motion.div
        className={cn(
          sizeClasses[size],
          "rounded-lg bg-gradient-to-br from-[#0B1D3C] to-[#051026]",
          "border-2 border-amber-500/60",
          "shadow-lg shadow-black/50",
          "flex items-center justify-center relative overflow-hidden"
        )}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-1 border border-amber-500/30 rounded-md" />
        <div className="absolute inset-2 border border-amber-500/20 rounded" />
        <div className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-500/70">
            <path 
              fill="currentColor" 
              d="M12 2L8 8H4L6 14L4 20H20L18 14L20 8H16L12 2ZM12 5L14.5 9H17L15.5 13L17 18H7L8.5 13L7 9H9.5L12 5Z"
            />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent" />
      </motion.div>
    );
  }

  return (
    <motion.button
      className={cn(
        sizeClasses[size],
        "rounded-lg bg-white border-2",
        "shadow-lg shadow-black/40",
        "flex flex-col items-center justify-center relative",
        "transition-all duration-150",
        isPlayable && !isCovered ? "cursor-pointer border-gray-200" : "cursor-default border-gray-300",
        isCovered && "brightness-50",
        !card.isPlayable && "opacity-60 brightness-75",
        suitColors[card.suit]
      )}
      onClick={isPlayable && !isCovered ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable && !isCovered ? { scale: 1.08, y: -6 } : {}}
      whileTap={isPlayable && !isCovered ? { scale: 0.95 } : {}}
      data-testid={`card-${card.id}`}
    >
      <span className={cn("font-bold leading-none", valueSizes[size])}>{card.value}</span>
      <span className={cn("leading-none mt-0.5", suitSizes[size])}>{suitSymbols[card.suit]}</span>
    </motion.button>
  );
}
