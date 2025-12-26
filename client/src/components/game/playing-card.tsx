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

const suitColors: Record<Suit, { text: string; fill: string }> = {
  hearts: { text: '#dc2626', fill: '#dc2626' },
  diamonds: { text: '#dc2626', fill: '#dc2626' },
  clubs: { text: '#1f2937', fill: '#1f2937' },
  spades: { text: '#1f2937', fill: '#1f2937' },
};

const sizeClasses = {
  sm: 'w-10 h-14',
  md: 'w-12 h-16 sm:w-14 sm:h-20',
  lg: 'w-14 h-20 sm:w-16 sm:h-24',
};

const cornerSizes = {
  sm: { rank: 'text-[10px]', suit: 'text-[8px]' },
  md: { rank: 'text-xs sm:text-sm', suit: 'text-[10px] sm:text-xs' },
  lg: { rank: 'text-sm sm:text-base', suit: 'text-xs sm:text-sm' },
};

const centerSuitSizes = {
  sm: 'text-lg',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl',
};

function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div 
      className={cn(
        sizeClasses[size],
        "rounded-lg relative overflow-hidden"
      )}
      style={{
        background: '#FFFFFF',
        border: '1px solid #d1d5db',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div 
        className="absolute inset-[3px] rounded-md overflow-hidden"
        style={{
          background: '#dc2626',
        }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.15) 3px,
                rgba(255,255,255,0.15) 4px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.15) 3px,
                rgba(255,255,255,0.15) 4px
              )
            `
          }}
        />
        <div 
          className="absolute inset-1 rounded-sm"
          style={{ border: '1px solid rgba(255,255,255,0.3)' }}
        />
      </div>
    </div>
  );
}

function getFaceCardArt(value: string): string {
  if (value === 'K') return 'K';
  if (value === 'Q') return 'Q';
  if (value === 'J') return 'J';
  return '';
}

export function PlayingCard({ 
  card, 
  isPlayable = false, 
  isCovered = false,
  isShaking = false,
  onClick,
  size = 'md'
}: PlayingCardProps) {
  
  if (!card.isFaceUp) {
    return <CardBack size={size} />;
  }

  const colors = suitColors[card.suit];
  const isFaceCard = ['K', 'Q', 'J'].includes(card.value);
  const isAce = card.value === 'A';

  return (
    <motion.button
      className={cn(
        sizeClasses[size],
        "rounded-lg flex flex-col relative overflow-hidden",
        "transition-all duration-150",
        isPlayable && !isCovered ? "cursor-pointer" : "cursor-default",
        isCovered && "brightness-75",
      )}
      style={{
        background: '#FFFFFF',
        border: '1px solid #d1d5db',
        boxShadow: isCovered 
          ? '0 1px 2px rgba(0,0,0,0.1)' 
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
      onClick={isPlayable && !isCovered ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable && !isCovered ? { 
        scale: 1.08, 
        y: -4,
        boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
      } : {}}
      whileTap={isPlayable && !isCovered ? { scale: 0.95 } : {}}
      data-testid={`card-${card.id}`}
    >
      {/* Top-left corner */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span 
          className={cn("font-bold", cornerSizes[size].rank)}
          style={{ color: colors.text }}
        >
          {card.value}
        </span>
        <span 
          className={cornerSizes[size].suit}
          style={{ color: colors.text }}
        >
          {suitSymbols[card.suit]}
        </span>
      </div>

      {/* Bottom-right corner (inverted) */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
        <span 
          className={cn("font-bold", cornerSizes[size].rank)}
          style={{ color: colors.text }}
        >
          {card.value}
        </span>
        <span 
          className={cornerSizes[size].suit}
          style={{ color: colors.text }}
        >
          {suitSymbols[card.suit]}
        </span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center">
        {isAce ? (
          <span 
            className={cn("font-normal", centerSuitSizes[size])}
            style={{ color: colors.text }}
          >
            {suitSymbols[card.suit]}
          </span>
        ) : isFaceCard ? (
          <div 
            className="flex items-center justify-center"
            style={{ color: colors.text }}
          >
            <svg 
              viewBox="0 0 40 60" 
              className={cn(
                size === 'sm' ? 'w-6 h-9' : size === 'md' ? 'w-7 h-10 sm:w-8 sm:h-12' : 'w-9 h-14 sm:w-10 sm:h-16'
              )}
            >
              {card.value === 'K' && (
                <>
                  <circle cx="20" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="17" y="10" width="6" height="3" fill="currentColor"/>
                  <path d="M12 20 L28 20 L26 35 L20 32 L14 35 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="20" y1="35" x2="20" y2="50" stroke="currentColor" strokeWidth="2"/>
                  <line x1="14" y1="50" x2="26" y2="50" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="25" x2="32" y2="25" stroke="currentColor" strokeWidth="1.5"/>
                </>
              )}
              {card.value === 'Q' && (
                <>
                  <circle cx="20" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M15 8 L20 5 L25 8" fill="none" stroke="currentColor" strokeWidth="1"/>
                  <path d="M12 20 L28 20 L26 40 L14 40 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <ellipse cx="20" cy="48" rx="8" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </>
              )}
              {card.value === 'J' && (
                <>
                  <circle cx="20" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="16" y="7" width="8" height="4" fill="currentColor"/>
                  <path d="M14 20 L26 20 L26 35 L14 35 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="20" y1="35" x2="20" y2="48" stroke="currentColor" strokeWidth="2"/>
                  <path d="M15 48 L20 52 L25 48" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </>
              )}
            </svg>
          </div>
        ) : (
          <span 
            className={cn("font-normal", centerSuitSizes[size])}
            style={{ color: colors.text }}
          >
            {suitSymbols[card.suit]}
          </span>
        )}
      </div>
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
        className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg"
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
          size="md"
        />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg"
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
