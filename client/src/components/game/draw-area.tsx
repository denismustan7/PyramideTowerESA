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
      className="w-2.5 h-16 rounded-full overflow-hidden relative"
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
    <div className="relative z-20 p-2 sm:p-4 pb-4 sm:pb-6 bg-[#000814]/95 border-t border-amber-500/30">
      <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-xl mx-auto">
        <TimerBar timeRemaining={timeRemaining} maxTime={maxTime} />

        <motion.button
          className={`relative w-12 h-16 sm:w-14 sm:h-20 rounded-md flex items-center justify-center ${
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
                className="absolute inset-0 rounded-lg transform translate-x-0.5 translate-y-0.5"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #d1d5db',
                }}
              />
              <div 
                className="absolute inset-0 rounded-lg overflow-hidden"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #d1d5db',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <div 
                  className="absolute inset-[2px] rounded-md overflow-hidden"
                  style={{ background: '#dc2626' }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 4px),
                        repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 4px)
                      `
                    }}
                  />
                  <div 
                    className="absolute inset-1 rounded-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.3)' }}
                  />
                </div>
              </div>
              <div 
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-lg"
                style={{ 
                  background: '#dc2626',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)' 
                }}
              >
                {drawPile.length}
              </div>
            </>
          ) : (
            <div 
              className="w-full h-full rounded-md flex items-center justify-center"
              style={{ border: '2px dashed rgba(100, 100, 100, 0.5)' }}
            >
              <span className="text-gray-600 text-[8px] sm:text-[10px]">Leer</span>
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
              className="w-12 h-16 sm:w-14 sm:h-20 rounded-md flex items-center justify-center"
              style={{ border: '2px dashed rgba(100, 100, 100, 0.5)' }}
            />
          )}
        </div>

        <AnimatePresence mode="wait">
          <BonusSlot 
            key={`slot1-${bonusSlot1.card?.id ?? 'empty'}`}
            card={bonusSlot1.card} 
            isActive={bonusSlot1.isActive} 
            slotNumber={1}
            hasSelectedCard={false}
            onClick={() => onPlayOnSlot(1)}
          />
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <BonusSlot 
            key={`slot2-${bonusSlot2.card?.id ?? 'empty'}`}
            card={bonusSlot2.card} 
            isActive={bonusSlot2.isActive} 
            slotNumber={2}
            hasSelectedCard={false}
            onClick={() => onPlayOnSlot(2)}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
