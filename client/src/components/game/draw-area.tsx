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
    <div className="relative z-20 p-4 bg-[#0a0e14]/90 border-t border-amber-500/20">
      <div className="flex items-center justify-center gap-6 max-w-md mx-auto">
        {/* Draw Pile */}
        <motion.button
          className={`relative w-16 h-24 rounded-lg border-2 flex items-center justify-center ${
            hasCards && !disabled
              ? 'border-amber-500/40 bg-[#0B1D3C] cursor-pointer hover-elevate'
              : 'border-gray-700/40 bg-gray-800/30 cursor-not-allowed'
          }`}
          onClick={hasCards && !disabled ? onDraw : undefined}
          whileHover={hasCards && !disabled ? { scale: 1.05 } : {}}
          whileTap={hasCards && !disabled ? { scale: 0.95 } : {}}
          data-testid="draw-pile"
        >
          {hasCards ? (
            <>
              {/* Stacked cards effect */}
              <div className="absolute inset-0 rounded-lg border border-amber-500/20 transform translate-x-0.5 translate-y-0.5" />
              <div className="absolute inset-0 rounded-lg border border-amber-500/20 transform translate-x-1 translate-y-1" />
              <div className="relative w-full h-full rounded-lg bg-[#0B1D3C] border-2 border-amber-500/40 flex items-center justify-center">
                <div className="w-3/4 h-3/4 border border-amber-500/30 rounded flex items-center justify-center">
                  <span className="text-amber-500/60 text-xs font-bold">MT</span>
                </div>
              </div>
              {/* Card count badge */}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center">
                {drawPile.length}
              </div>
            </>
          ) : (
            <span className="text-gray-600 text-xs">Leer</span>
          )}
        </motion.button>

        {/* Discard Pile */}
        <div className="relative">
          {discardTop ? (
            <motion.div
              key={discardTop.id}
              initial={{ scale: 0.8, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="w-16 h-24"
            >
              <PlayingCard
                card={discardTop}
                isPlayable={false}
                isHighlighted={false}
                size="lg"
              />
            </motion.div>
          ) : (
            <div className="w-16 h-24 rounded-lg border-2 border-dashed border-gray-700/40 flex items-center justify-center">
              <span className="text-gray-600 text-xs">Ablage</span>
            </div>
          )}
          
          {/* Label */}
          <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
            Ablagestapel
          </p>
        </div>
      </div>
      
      {/* Instructions */}
      <p className="text-center text-gray-500 text-xs mt-6">
        Tippe auf eine Karte mit +1 oder -1 Wert
      </p>
    </div>
  );
}
