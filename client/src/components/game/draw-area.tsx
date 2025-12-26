import { motion, AnimatePresence } from "framer-motion";
import type { Card, BonusSlotState } from "@shared/schema";
import { PlayingCard, BonusSlot } from "./playing-card";

interface DrawAreaProps {
  drawPile: Card[];
  discardPile: Card[];
  bonusSlot1: BonusSlotState;
  bonusSlot2: BonusSlotState;
  selectedCardId: string | null;
  timeRemaining: number;
  maxTime: number;
  onDraw: () => void;
  onPlayOnSlot: (slotNumber: 1 | 2) => void;
  disabled?: boolean;
}

function TimerBar({ timeRemaining, maxTime }: { timeRemaining: number; maxTime: number }) {
  const percentage = Math.max(0, Math.min(100, (timeRemaining / maxTime) * 100));
  
  const getColor = () => {
    if (percentage > 50) return '#22c55e';
    if (percentage > 25) return '#eab308';
    return '#ef4444';
  };

  return (
    <div 
      className="w-3 h-20 rounded-full overflow-hidden relative"
      style={{ 
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(100, 100, 100, 0.3)'
      }}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 rounded-full"
        style={{ 
          background: getColor(),
          boxShadow: `0 0 10px ${getColor()}, 0 0 20px ${getColor()}40`
        }}
        initial={false}
        animate={{ height: `${percentage}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

export function DrawArea({ 
  drawPile, 
  discardPile, 
  bonusSlot1, 
  bonusSlot2,
  selectedCardId,
  timeRemaining,
  maxTime,
  onDraw,
  onPlayOnSlot,
  disabled = false 
}: DrawAreaProps) {
  const discardTop = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const hasCards = drawPile.length > 0;

  return (
    <div className="relative z-20 p-4 pb-6 bg-[#000814]/95 border-t border-amber-500/30">
      <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <BonusSlot 
            key="slot1"
            card={bonusSlot1.card} 
            isActive={bonusSlot1.isActive} 
            slotNumber={1}
            hasSelectedCard={!!selectedCardId}
            onClick={() => onPlayOnSlot(1)}
          />
        </AnimatePresence>

        <TimerBar timeRemaining={timeRemaining} maxTime={maxTime} />

        <motion.button
          className={`relative w-16 h-22 rounded-lg flex items-center justify-center ${
            hasCards && !disabled
              ? 'cursor-pointer'
              : 'cursor-not-allowed'
          }`}
          onClick={hasCards && !disabled ? onDraw : undefined}
          whileHover={hasCards && !disabled ? { scale: 1.08 } : {}}
          whileTap={hasCards && !disabled ? { scale: 0.95 } : {}}
          data-testid="draw-pile"
        >
          {hasCards ? (
            <>
              <div 
                className="absolute inset-0 rounded-lg transform translate-x-0.5 translate-y-0.5 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #0B1D3C 0%, #051026 100%)',
                  border: '2px solid rgba(212, 175, 55, 0.4)',
                }}
              />
              <div 
                className="absolute inset-0 rounded-lg shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #0B1D3C 0%, #051026 100%)',
                  border: '2px solid rgba(212, 175, 55, 0.5)',
                }}
              >
                <div 
                  className="absolute inset-1 rounded-md"
                  style={{ border: '1px solid rgba(212, 175, 55, 0.3)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'rgba(212, 175, 55, 0.7)' }}>
                    <path 
                      fill="currentColor" 
                      d="M12 2L8 8H4L6 14L4 20H20L18 14L20 8H16L12 2ZM12 5L14.5 9H17L15.5 13L17 18H7L8.5 13L7 9H9.5L12 5Z"
                    />
                  </svg>
                </div>
              </div>
              <div 
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-black text-xs font-bold flex items-center justify-center shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                  boxShadow: '0 0 8px rgba(212, 175, 55, 0.5)' 
                }}
              >
                {drawPile.length}
              </div>
            </>
          ) : (
            <div 
              className="w-full h-full rounded-lg flex items-center justify-center"
              style={{ border: '2px dashed rgba(100, 100, 100, 0.5)' }}
            >
              <span className="text-gray-600 text-xs">Leer</span>
            </div>
          )}
        </motion.button>

        <div className="relative">
          {discardTop ? (
            <motion.div
              key={discardTop.id}
              initial={{ scale: 0.8, y: -30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <PlayingCard
                card={discardTop}
                isPlayable={false}
                size="md"
              />
            </motion.div>
          ) : (
            <div 
              className="w-14 h-20 rounded-lg flex items-center justify-center"
              style={{ border: '2px dashed rgba(100, 100, 100, 0.5)' }}
            >
              <span className="text-gray-600 text-xs">Ablage</span>
            </div>
          )}
        </div>

        <TimerBar timeRemaining={timeRemaining} maxTime={maxTime} />

        <AnimatePresence mode="wait">
          <BonusSlot 
            key="slot2"
            card={bonusSlot2.card} 
            isActive={bonusSlot2.isActive} 
            slotNumber={2}
            hasSelectedCard={!!selectedCardId}
            onClick={() => onPlayOnSlot(2)}
          />
        </AnimatePresence>
      </div>
      
      <p className="text-center text-gray-500 text-xs mt-3">
        Tippe auf eine Karte mit +1 oder -1 Wert
      </p>
    </div>
  );
}
