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
  sm: 'w-10 h-14',
  md: 'w-12 h-16',
  lg: 'w-14 h-20',
};

const valueSizes = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const suitSizes = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
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
          "rounded-md relative overflow-hidden"
        )}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 25%, #1e3a5f 50%, #2c5282 75%, #1e3a5f 100%)',
          border: '2px solid #D4AF37',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 0 15px rgba(0,0,0,0.3)'
        }}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Diamond pattern overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212, 175, 55, 0.15) 4px, rgba(212, 175, 55, 0.15) 5px),
              repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(212, 175, 55, 0.15) 4px, rgba(212, 175, 55, 0.15) 5px)
            `
          }}
        />
        {/* Inner border frame */}
        <div 
          className="absolute inset-1 rounded-sm" 
          style={{ border: '1px solid rgba(212, 175, 55, 0.5)' }}
        />
        {/* Center star symbol */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className={cn(size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} style={{ color: '#D4AF37' }}>
            <path 
              fill="currentColor" 
              d="M12 2L8 8H4L6 14L4 20H20L18 14L20 8H16L12 2ZM12 5L14.5 9H17L15.5 13L17 18H7L8.5 13L7 9H9.5L12 5Z"
            />
          </svg>
        </div>
        {/* Bottom glow */}
        <div 
          className="absolute inset-0" 
          style={{ background: 'linear-gradient(to top, rgba(212, 175, 55, 0.15), transparent 50%)' }}
        />
      </motion.div>
    );
  }

  return (
    <motion.button
      className={cn(
        sizeClasses[size],
        "rounded-lg flex flex-col items-center justify-center relative overflow-hidden",
        "transition-all duration-150",
        isPlayable && !isCovered ? "cursor-pointer" : "cursor-default",
        isCovered && "brightness-40 saturate-50",
      )}
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F0 50%, #E8E4D9 100%)',
        border: '3px solid',
        borderColor: '#D4AF37',
        boxShadow: isCovered 
          ? '0 2px 6px rgba(0,0,0,0.4)' 
          : '0 4px 12px rgba(0,0,0,0.5), 0 0 20px rgba(212, 175, 55, 0.2)',
      }}
      onClick={isPlayable && !isCovered ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable && !isCovered ? { 
        scale: 1.1, 
        y: -8,
        boxShadow: '0 8px 20px rgba(0,0,0,0.6), 0 0 30px rgba(212, 175, 55, 0.4)'
      } : {}}
      whileTap={isPlayable && !isCovered ? { scale: 0.95 } : {}}
      data-testid={`card-${card.id}`}
    >
      <div 
        className="absolute inset-0.5 rounded pointer-events-none"
        style={{ 
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      />
      
      <span 
        className={cn(
          "font-black leading-none tracking-tight",
          valueSizes[size],
          suitColors[card.suit]
        )}
        style={{
          textShadow: card.suit === 'hearts' || card.suit === 'diamonds' 
            ? '1px 1px 0 rgba(180, 0, 0, 0.3)' 
            : '1px 1px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        {card.value}
      </span>
      <span 
        className={cn(
          "leading-none -mt-1",
          suitSizes[size],
          suitColors[card.suit]
        )}
      >
        {suitSymbols[card.suit]}
      </span>
    </motion.button>
  );
}

interface BonusSlotProps {
  card: Card | null;
  isActive: boolean;
  slotNumber: 1 | 2;
  hasSelectedCard?: boolean;
  onClick?: () => void;
}

export function BonusSlot({ card, isActive, slotNumber, hasSelectedCard, onClick }: BonusSlotProps) {
  if (!isActive) {
    return (
      <div 
        className="w-12 h-16 sm:w-14 sm:h-20 rounded-md"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(100, 100, 100, 0.4)',
        }}
      />
    );
  }

  if (card) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        data-testid={`bonus-slot-${slotNumber}`}
      >
        <PlayingCard
          card={card}
          isPlayable={false}
          isCovered={false}
          size="lg"
        />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="w-12 h-16 sm:w-14 sm:h-20 rounded-md"
      style={{
        background: 'rgba(212, 175, 55, 0.1)',
        border: '2px dashed #D4AF37',
        boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: ['0 0 15px rgba(212, 175, 55, 0.3)', '0 0 25px rgba(212, 175, 55, 0.5)', '0 0 15px rgba(212, 175, 55, 0.3)']
      }}
      transition={{ 
        duration: 0.3,
        boxShadow: { duration: 1.5, repeat: Infinity }
      }}
      data-testid={`bonus-slot-${slotNumber}`}
    />
  );
}
