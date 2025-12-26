import { motion } from "framer-motion";
import type { Card } from "@shared/schema";
import { PlayingCard } from "./playing-card";

interface DrawAreaProps {
  drawPile: Card[];
  discardPile: Card[];
  onDraw: () => void;
  disabled?: boolean;
}

export function DrawArea({ drawPile, discardPile, onDraw, disabled = false }: DrawAreaProps) {
  const discardTop = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const hasCards = drawPile.length > 0;

  return (
    <div className="relative z-20 p-4 pb-6 bg-[#000814]/95 border-t border-amber-500/30">
      <div className="flex items-center justify-center gap-8 max-w-md mx-auto">
        <motion.button
          className={`relative w-20 h-28 rounded-lg flex items-center justify-center ${
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
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#0B1D3C] to-[#051026] border-2 border-amber-500/40 transform translate-x-1 translate-y-1 shadow-lg" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#0B1D3C] to-[#051026] border-2 border-amber-500/50 shadow-lg">
                <div className="absolute inset-1 border border-amber-500/30 rounded-md" />
                <div className="absolute inset-2 border border-amber-500/20 rounded" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-500/70">
                    <path 
                      fill="currentColor" 
                      d="M12 2L8 8H4L6 14L4 20H20L18 14L20 8H16L12 2ZM12 5L14.5 9H17L15.5 13L17 18H7L8.5 13L7 9H9.5L12 5Z"
                    />
                  </svg>
                </div>
              </div>
              <div 
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black text-sm font-bold flex items-center justify-center shadow-lg"
                style={{ boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)' }}
              >
                {drawPile.length}
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-700/50 flex items-center justify-center">
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
              className="w-20 h-28"
            >
              <PlayingCard
                card={discardTop}
                isPlayable={false}
                size="lg"
              />
            </motion.div>
          ) : (
            <div className="w-20 h-28 rounded-lg border-2 border-dashed border-gray-700/50 flex items-center justify-center">
              <span className="text-gray-600 text-xs">Ablage</span>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-center text-gray-500 text-xs mt-4">
        Tippe auf eine Karte mit +1 oder -1 Wert
      </p>
    </div>
  );
}
