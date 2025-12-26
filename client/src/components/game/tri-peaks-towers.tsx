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

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

interface TowerCardProps {
  card: Card;
  isPlayable: boolean;
  isDimmed: boolean;
  isSelected: boolean;
  isShaking: boolean;
  onClick: () => void;
}

function TowerCard({ card, isPlayable, isDimmed, isSelected, isShaking, onClick }: TowerCardProps) {
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
      data-testid={`tower-card-${card.id}`}
    >
      {isDimmed && (
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

interface SingleTowerProps {
  nodes: PyramidNode[];
  towerIndex: number;
  onCardClick: (cardId: string) => void;
  selectedCardId: string | null;
  shakeCardId: string | null;
}

function SingleTower({ nodes, towerIndex, onCardClick, selectedCardId, shakeCardId }: SingleTowerProps) {
  const numRows = TOWER_ROWS.length;
  const cardWidth = 36;
  const cardGap = 2;
  const rowOffset = (cardWidth + cardGap) / 2;
  const verticalOverlap = 22;

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
                    className="w-9 h-12 flex-shrink-0"
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
    <div className="flex items-end justify-center gap-4" style={{ marginTop: '10px' }}>
      {Array.from({ length: NUM_TOWERS }, (_, towerIdx) => (
        <SingleTower
          key={`tower-${towerIdx}`}
          nodes={getTowerNodes(towerIdx)}
          towerIndex={towerIdx}
          onCardClick={onCardClick}
          selectedCardId={selectedCardId}
          shakeCardId={shakeCardId}
        />
      ))}
    </div>
  );
}
