import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PyramidNode, Card, Suit } from "@shared/schema";
import { PYRAMID_ROWS } from "@shared/schema";

interface BrickPyramidProps {
  pyramid: PyramidNode[];
  onCardClick: (cardId: string) => void;
  selectedCardId: string | null;
  shakeCardId: string | null;
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

interface PyramidCardProps {
  card: Card;
  isPlayable: boolean;
  isSecondRow: boolean;
  isSelected: boolean;
  isShaking: boolean;
  onClick: () => void;
}

function PyramidCard({ card, isPlayable, isSecondRow, isSelected, isShaking, onClick }: PyramidCardProps) {
  if (!card.isFaceUp) {
    return (
      <div
        className="w-9 h-12 rounded-md relative overflow-hidden flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 25%, #1e3a5f 50%, #2c5282 75%, #1e3a5f 100%)',
          border: '2px solid #D4AF37',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
        }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(212, 175, 55, 0.12) 3px, rgba(212, 175, 55, 0.12) 4px),
              repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(212, 175, 55, 0.12) 3px, rgba(212, 175, 55, 0.12) 4px)
            `
          }}
        />
        <div 
          className="absolute inset-0.5 rounded-sm" 
          style={{ border: '1px solid rgba(212, 175, 55, 0.4)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: '#D4AF37' }}>
            <path 
              fill="currentColor" 
              d="M12 2L8 8H4L6 14L4 20H20L18 14L20 8H16L12 2ZM12 5L14.5 9H17L15.5 13L17 18H7L8.5 13L7 9H9.5L12 5Z"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      className={cn(
        "w-9 h-12 rounded-md flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0",
        "transition-all duration-150",
        isPlayable ? "cursor-pointer" : "cursor-default",
        isSelected && "ring-2 ring-amber-400 ring-offset-1"
      )}
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F0 50%, #E8E4D9 100%)',
        border: '2px solid #D4AF37',
        boxShadow: isPlayable 
          ? '0 3px 10px rgba(0,0,0,0.4), 0 0 15px rgba(212, 175, 55, 0.2)'
          : '0 2px 4px rgba(0,0,0,0.3)',
      }}
      onClick={isPlayable ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -3, 3, -3, 3, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable ? { 
        scale: 1.12, 
        y: -6,
        boxShadow: '0 6px 15px rgba(0,0,0,0.5), 0 0 25px rgba(212, 175, 55, 0.4)'
      } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      data-testid={`pyramid-card-${card.id}`}
    >
      {isSecondRow && (
        <div 
          className="absolute inset-0 z-10 rounded-md"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
      )}
      <span 
        className={cn(
          "font-black text-lg leading-none tracking-tight relative z-0",
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
          "text-xs leading-none -mt-0.5 relative z-0",
          suitColors[card.suit]
        )}
      >
        {suitSymbols[card.suit]}
      </span>
    </motion.button>
  );
}

export function BrickPyramid({ pyramid, onCardClick, selectedCardId, shakeCardId }: BrickPyramidProps) {
  const numRows = PYRAMID_ROWS.length;
  
  const getRowNodes = (rowIdx: number): PyramidNode[] => {
    return pyramid.filter(n => n.row === rowIdx);
  };

  const cardWidth = 36;
  const cardGap = 2;
  const rowOffset = (cardWidth + cardGap) / 2;
  const verticalOverlap = 26;

  return (
    <div className="relative flex flex-col items-center" style={{ marginTop: '10px' }}>
      {Array.from({ length: numRows }, (_, rowIdx) => {
        const rowNodes = getRowNodes(rowIdx);
        const isOddRow = rowIdx % 2 === 1;
        
        return (
          <div
            key={rowIdx}
            className="flex items-center justify-center gap-0.5"
            style={{
              marginTop: rowIdx === 0 ? 0 : `-${verticalOverlap}px`,
              marginLeft: isOddRow ? `${rowOffset}px` : 0,
              zIndex: rowIdx + 1,
              position: 'relative'
            }}
          >
            {rowNodes.map((node, colIdx) => {
              if (!node.card) {
                return (
                  <div 
                    key={`empty-${rowIdx}-${colIdx}`} 
                    className="w-9 h-12 flex-shrink-0"
                    style={{ visibility: 'hidden' }}
                  />
                );
              }
              
              return (
                <PyramidCard
                  key={node.card.id}
                  card={node.card}
                  isPlayable={node.card.isPlayable}
                  isSecondRow={node.isSecondRow}
                  isSelected={selectedCardId === node.card.id}
                  isShaking={shakeCardId === node.card.id}
                  onClick={() => onCardClick(node.card!.id)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
