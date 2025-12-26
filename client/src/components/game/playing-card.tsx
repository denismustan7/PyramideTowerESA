import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Card, Suit } from "@shared/schema";

interface PlayingCardProps {
  card: Card;
  isPlayable?: boolean;
  isHighlighted?: boolean;
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
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

const sizeClasses = {
  sm: 'w-10 h-14 text-sm',
  md: 'w-14 h-20 text-lg',
  lg: 'w-16 h-24 text-xl',
};

export function PlayingCard({ 
  card, 
  isPlayable = false, 
  isHighlighted = false,
  isShaking = false,
  onClick,
  size = 'md'
}: PlayingCardProps) {
  
  if (!card.isFaceUp) {
    // Card back
    return (
      <motion.div
        className={cn(
          sizeClasses[size],
          "rounded-md border-2 border-amber-500/40 bg-[#0B1D3C] flex items-center justify-center",
          "shadow-lg"
        )}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-3/4 h-3/4 border border-amber-500/30 rounded flex items-center justify-center">
          <span className="text-amber-500/60 text-xs">MT</span>
        </div>
      </motion.div>
    );
  }

  // Card face
  return (
    <motion.button
      className={cn(
        sizeClasses[size],
        "rounded-md border-2 bg-white flex flex-col items-center justify-center relative",
        "shadow-lg transition-all duration-150",
        isPlayable ? "cursor-pointer" : "cursor-default",
        isHighlighted 
          ? "border-cyan-400 shadow-cyan-400/50 shadow-lg ring-2 ring-cyan-400/50" 
          : "border-amber-500/30",
        !card.isPlayable && "opacity-50 grayscale",
        suitColors[card.suit]
      )}
      onClick={isPlayable ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable ? { scale: 1.05, y: -4 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      data-testid={`card-${card.id}`}
    >
      {/* Value */}
      <span className="font-bold leading-none">{card.value}</span>
      {/* Suit */}
      <span className="text-xs leading-none">{suitSymbols[card.suit]}</span>
      
      {/* Highlight glow */}
      {isHighlighted && (
        <motion.div
          className="absolute inset-0 rounded-md bg-cyan-400/20"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}
