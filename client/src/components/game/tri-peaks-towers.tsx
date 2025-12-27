import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PyramidNode, Card, Suit } from "@shared/schema";
import { TOWER_ROWS, NUM_TOWERS } from "@shared/schema";
import { useState, useEffect } from "react";

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

function useResponsiveCardSize() {
  const [size, setSize] = useState({ width: 64, height: 96, scale: 0.85 });
  
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      
      // Calculate scale to fit 3 towers side by side
      // Each tower base = ~4 cards wide with overlap
      // Total width needed = ~10 card widths (with overlaps and gaps)
      // Scale = available width / needed width
      
      if (vw < 360) {
        // Very small phones
        setSize({ width: 42, height: 63, scale: 0.58 });
      } else if (vw < 400) {
        // Small phones (iPhone SE, budget phones)
        setSize({ width: 44, height: 66, scale: 0.64 });
      } else if (vw < 440) {
        // Modern flagship phones portrait (iPhone 14/15/16 Pro ~393-430px)
        setSize({ width: 46, height: 69, scale: 0.68 });
      } else if (vw < 540) {
        // Large phones / phablets portrait
        setSize({ width: 48, height: 72, scale: 0.74 });
      } else if (vw < 768) {
        // Small tablets / phones landscape
        setSize({ width: 52, height: 78, scale: 0.82 });
      } else if (vw < 1024) {
        // Tablets
        setSize({ width: 56, height: 84, scale: 0.88 });
      } else {
        // Desktop
        setSize({ width: 60, height: 90, scale: 0.94 });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return size;
}

interface TowerCardProps {
  card: Card;
  isPlayable: boolean;
  isDimmed: boolean;
  isSelected: boolean;
  isShaking: boolean;
  onClick: () => void;
  cardWidth: number;
  cardHeight: number;
}

function CardBack({ cardWidth, cardHeight }: { cardWidth: number; cardHeight: number }) {
  return (
    <div 
      className="rounded-lg overflow-hidden flex-shrink-0 relative"
      style={{
        width: cardWidth,
        height: cardHeight,
        background: '#FFFFFF',
        border: '1px solid #d1d5db',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.15) 2px,
                rgba(255,255,255,0.15) 3px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.15) 2px,
                rgba(255,255,255,0.15) 3px
              )
            `
          }}
        />
        <div 
          className="absolute inset-0.5 rounded-sm"
          style={{ border: '1px solid rgba(255,255,255,0.3)' }}
        />
      </div>
    </div>
  );
}

function TowerCard({ card, isPlayable, isDimmed, isSelected, isShaking, onClick, cardWidth, cardHeight }: TowerCardProps) {
  if (!card.isFaceUp) {
    return <CardBack cardWidth={cardWidth} cardHeight={cardHeight} />;
  }

  const colors = suitColors[card.suit];
  const isFaceCard = ['K', 'Q', 'J'].includes(card.value);
  const isAce = card.value === 'A';
  const isSmall = cardWidth < 50;
  const fontSize = isSmall ? 'text-[8px]' : cardWidth < 60 ? 'text-[10px]' : 'text-xs';
  const suitSize = isSmall ? 'text-[7px]' : cardWidth < 60 ? 'text-[9px]' : 'text-[10px]';
  const centerSize = isSmall ? 'text-lg' : cardWidth < 60 ? 'text-xl' : 'text-2xl';

  return (
    <motion.button
      className={cn(
        "rounded-lg flex flex-col relative overflow-hidden flex-shrink-0",
        "transition-all duration-150",
        isPlayable ? "cursor-pointer" : "cursor-default pointer-events-none",
        isSelected && "ring-2 ring-amber-400 ring-offset-1"
      )}
      style={{
        width: cardWidth,
        height: cardHeight,
        background: '#FFFFFF',
        border: '1px solid #d1d5db',
        boxShadow: isPlayable 
          ? '0 3px 10px rgba(0,0,0,0.2)'
          : '0 2px 4px rgba(0,0,0,0.1)',
        minWidth: 44,
        minHeight: 44,
      }}
      onClick={isPlayable ? onClick : undefined}
      animate={isShaking ? {
        x: [0, -3, 3, -3, 3, 0],
        transition: { duration: 0.3 }
      } : {}}
      whileHover={isPlayable ? { 
        scale: 1.1, 
        y: -4,
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

      <div className="absolute top-0.5 left-0.5 flex flex-col items-center leading-none z-0">
        <span className={cn("font-bold", fontSize)} style={{ color: colors.text }}>
          {card.value}
        </span>
        <span className={suitSize} style={{ color: colors.text }}>
          {suitSymbols[card.suit]}
        </span>
      </div>

      <div className="absolute bottom-0.5 right-0.5 flex flex-col items-center leading-none rotate-180 z-0">
        <span className={cn("font-bold", fontSize)} style={{ color: colors.text }}>
          {card.value}
        </span>
        <span className={suitSize} style={{ color: colors.text }}>
          {suitSymbols[card.suit]}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center z-0">
        {isAce ? (
          <span className={centerSize} style={{ color: colors.text }}>
            {suitSymbols[card.suit]}
          </span>
        ) : isFaceCard ? (
          <div style={{ color: colors.text }}>
            <svg viewBox="0 0 40 60" style={{ width: cardWidth * 0.5, height: cardHeight * 0.5 }}>
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
          <span className={centerSize} style={{ color: colors.text }}>
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
  cardWidth: number;
  cardHeight: number;
}

function SingleTower({ nodes, towerIndex, onCardClick, selectedCardId, shakeCardId, cardWidth, cardHeight }: SingleTowerProps) {
  const numRows = TOWER_ROWS.length;
  const cardGap = 1;
  const rowOffset = (cardWidth + cardGap) / 2;
  const verticalOverlap = cardHeight * 0.5;

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
                    style={{ width: cardWidth, height: cardHeight, visibility: 'hidden' }}
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
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
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
  const { width: cardWidth, height: cardHeight, scale } = useResponsiveCardSize();
  
  const getTowerNodes = (towerIdx: number): PyramidNode[] => {
    return pyramid.filter(n => n.tower === towerIdx);
  };

  // Negative gap to make towers overlap slightly
  const towerGap = cardWidth < 48 ? -6 : cardWidth < 56 ? -10 : -14;

  return (
    <div 
      className="flex items-end justify-center origin-top" 
      style={{ transform: `scale(${scale})`, marginTop: '0px' }}
    >
      {Array.from({ length: NUM_TOWERS }, (_, towerIdx) => (
        <div 
          key={`tower-${towerIdx}`}
          style={{ marginLeft: towerIdx > 0 ? `${towerGap}px` : '0' }}
        >
          <SingleTower
            nodes={getTowerNodes(towerIdx)}
            towerIndex={towerIdx}
            onCardClick={onCardClick}
            selectedCardId={selectedCardId}
            shakeCardId={shakeCardId}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
          />
        </div>
      ))}
    </div>
  );
}
