import { motion } from "framer-motion";
import type { PyramidNode, CardValue } from "@shared/schema";
import { canPlayCard } from "@shared/schema";
import { PlayingCard } from "./playing-card";

interface PyramidBoardProps {
  pyramids: PyramidNode[][];
  discardTopValue: CardValue | null;
  onCardClick: (cardId: string) => void;
  shakeCardId: string | null;
}

export function PyramidBoard({ pyramids, discardTopValue, onCardClick, shakeCardId }: PyramidBoardProps) {
  // Flatten all pyramid nodes into a renderable structure
  // Standard Tri-Peaks layout for mobile
  
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Three peaks side by side */}
      <div className="flex justify-center gap-0 -mb-4">
        {pyramids.map((peak, peakIndex) => (
          <div key={peakIndex} className="relative" style={{ width: '33%' }}>
            <PeakPyramid
              nodes={peak.filter(n => n.row < 3)}
              discardTopValue={discardTopValue}
              onCardClick={onCardClick}
              shakeCardId={shakeCardId}
              peakIndex={peakIndex}
            />
          </div>
        ))}
      </div>
      
      {/* Bottom row - shared cards across all peaks */}
      <div className="flex justify-center mt-2">
        <div className="flex gap-0.5">
          {pyramids.flatMap((peak, peakIndex) => 
            peak
              .filter(n => n.row === 3)
              .map((node, idx) => {
                if (!node.card) return <div key={`empty-${peakIndex}-${idx}`} className="w-10 h-14" />;
                
                const canBePlayed = discardTopValue ? canPlayCard(node.card.value, discardTopValue) : false;
                const isPlayable = node.card.isPlayable && canBePlayed;
                
                return (
                  <PlayingCard
                    key={node.card.id}
                    card={node.card}
                    isPlayable={isPlayable}
                    isHighlighted={isPlayable}
                    isShaking={shakeCardId === node.card.id}
                    onClick={() => node.card && onCardClick(node.card.id)}
                    size="sm"
                  />
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

interface PeakPyramidProps {
  nodes: PyramidNode[];
  discardTopValue: CardValue | null;
  onCardClick: (cardId: string) => void;
  shakeCardId: string | null;
  peakIndex: number;
}

function PeakPyramid({ nodes, discardTopValue, onCardClick, shakeCardId, peakIndex }: PeakPyramidProps) {
  // Group nodes by row
  const rows = [
    nodes.filter(n => n.row === 0),
    nodes.filter(n => n.row === 1),
    nodes.filter(n => n.row === 2),
  ];

  return (
    <div className="flex flex-col items-center">
      {rows.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex justify-center gap-0.5"
          style={{ marginTop: rowIndex === 0 ? 0 : -8 }}
        >
          {row.map((node, idx) => {
            if (!node.card) {
              return <div key={`empty-${rowIndex}-${idx}`} className="w-10 h-14" />;
            }

            const canBePlayed = discardTopValue ? canPlayCard(node.card.value, discardTopValue) : false;
            const isPlayable = node.card.isPlayable && canBePlayed;

            return (
              <PlayingCard
                key={node.card.id}
                card={node.card}
                isPlayable={isPlayable}
                isHighlighted={isPlayable}
                isShaking={shakeCardId === node.card.id}
                onClick={() => node.card && onCardClick(node.card.id)}
                size="sm"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
