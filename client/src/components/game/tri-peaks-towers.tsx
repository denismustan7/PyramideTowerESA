import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PyramidNode, Card, Suit } from "@shared/schema";
import { TOWER_ROWS, NUM_TOWERS } from "@shared/schema";

interface TriPeaksTowersProps {
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

const suitColors: Record<Suit, { text: string; fill: string }> = {
  hearts: { text: '#dc2626', fill: '#dc2626' },
  diamonds: { text: '#dc2626', fill: '#dc2626' },
  clubs: { text: '#1f2937', fill: '#1f2937' },
  spades: { text: '#1f2937', fill: '#1f2937' },
};

interface TowerCardProps {
  card: Card;
  isPlayable: boolean;
  isDimmed: boolean;
  isSelected: boolean;
  isShaking: boolean;
  onClick: () => void;
}

function CardBack() {
  return (
    <div 
      className="w-14 h-20 sm:w-16 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 relative"
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

function TowerCard({ card, isPlayable, isDimmed, isSelected, isShaking, onClick }: TowerCardProps) {
  if (!card.isFaceUp) {
    return <CardBack />;
  }

  const colors = suitColors[card.suit];
  const isFaceCard = ['K', 'Q', 'J'].includes(card.value);
  const isAce = card.value === 'A';

  return (
    <motion.button
      className={cn(
        "w-14 h-20 sm:w-16 sm:h-24 rounded-lg flex flex-col relative overflow-hidden flex-shrink-0",
        "transition-all duration-150",
        isPlayable ? "cursor-pointer" : "cursor-default pointer-events-none",
        isSelected && "ring-2 ring-amber-400 ring-offset-1"
      )}
      style={{
        background: '#FFFFFF',
        border: '1px solid #d1d5db',
        boxShadow: isPlayable 
          ? '0 3px 10px rgba(0,0,0,0.2)'
          : '0 2px 4px rgba(0,0,0,0.1)',
      }}
      onClick={isPlayable ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -3, 3, -3, 3, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable ? { 
        scale: 1.12, 
        y: -6,
        boxShadow: '0 6px 15px rgba(0,0,0,0.25)'
      } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      data-testid={`tower-card-${card.id}`}
    >
      {isDimmed && (
        <div 
          className="absolute inset-0 z-10 rounded-lg"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
      )}

      {/* Top-left corner */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none z-0">
        <span 
          className="font-bold text-xs sm:text-sm"
          style={{ color: colors.text }}
        >
          {card.value}
        </span>
        <span 
          className="text-[10px] sm:text-xs"
          style={{ color: colors.text }}
        >
          {suitSymbols[card.suit]}
        </span>
      </div>

      {/* Bottom-right corner (inverted) */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180 z-0">
        <span 
          className="font-bold text-xs sm:text-sm"
          style={{ color: colors.text }}
        >
          {card.value}
        </span>
        <span 
          className="text-[10px] sm:text-xs"
          style={{ color: colors.text }}
        >
          {suitSymbols[card.suit]}
        </span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center z-0">
        {isAce ? (
          <span 
            className="text-2xl sm:text-3xl"
            style={{ color: colors.text }}
          >
            {suitSymbols[card.suit]}
          </span>
        ) : isFaceCard ? (
          <div 
            className="flex items-center justify-center"
            style={{ color: colors.text }}
          >
            <svg viewBox="0 0 40 60" className="w-8 h-12 sm:w-10 sm:h-14">
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
            className="text-2xl sm:text-3xl"
            style={{ color: colors.text }}
          >
            {suitSymbols[card.suit]}
          </span>
        )}
      </div>
    </motion.button>
  );
}

interface SingleTowerProps {
  nodes: PyramidNode[];
  towerIndex: number;
  onCardClick: (cardId: string) => void;
  selectedCardId: string | null;
  shakeCardId: string | null;
}

function SingleTower({ nodes, towerIndex, onCardClick, selectedCardId, shakeCardId }: SingleTowerProps) {
  const numRows = TOWER_ROWS.length;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cardWidth = isMobile ? 56 : 64;
  const cardGap = 1;
  const rowOffset = (cardWidth + cardGap) / 2;
  const verticalOverlap = isMobile ? 40 : 48;

  const getRowNodes = (rowIdx: number): PyramidNode[] => {
    return nodes.filter(n => n.row === rowIdx);
  };

  return (
    <div className="relative flex flex-col items-center">
      {Array.from({ length: numRows }, (_, rowIdx) => {
        const rowNodes = getRowNodes(rowIdx);
        const isOddRow = rowIdx % 2 === 1;
        
        return (
          <div
            key={`tower-${towerIndex}-row-${rowIdx}`}
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
                    key={`empty-${towerIndex}-${rowIdx}-${colIdx}`} 
                    className="w-14 h-20 sm:w-16 sm:h-24 flex-shrink-0"
                    style={{ visibility: 'hidden' }}
                  />
                );
              }
              
              return (
                <TowerCard
                  key={node.card.id}
                  card={node.card}
                  isPlayable={node.card.isPlayable}
                  isDimmed={node.isDimmed}
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

export function TriPeaksTowers({ pyramid, onCardClick, selectedCardId, shakeCardId }: TriPeaksTowersProps) {
  const getTowerNodes = (towerIdx: number): PyramidNode[] => {
    return pyramid.filter(n => n.tower === towerIdx);
  };

  return (
    <div className="flex items-end justify-center scale-[0.55] sm:scale-[0.85] origin-top" style={{ marginTop: '0px' }}>
      {Array.from({ length: NUM_TOWERS }, (_, towerIdx) => (
        <div 
          key={`tower-${towerIdx}`}
          style={{ marginLeft: towerIdx > 0 ? '-18px' : '0' }}
        >
          <SingleTower
            nodes={getTowerNodes(towerIdx)}
            towerIndex={towerIdx}
            onCardClick={onCardClick}
            selectedCardId={selectedCardId}
            shakeCardId={shakeCardId}
          />
        </div>
      ))}
    </div>
  );
}
