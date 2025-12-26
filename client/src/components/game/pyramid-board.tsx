import { motion } from "framer-motion";
import type { PyramidNode, CardValue } from "@shared/schema";
import { PlayingCard } from "./playing-card";

interface PyramidBoardProps {
  pyramids: PyramidNode[][];
  discardTopValue: CardValue | null;
  onCardClick: (cardId: string) => void;
  shakeCardId: string | null;
}

export function PyramidBoard({ pyramids, discardTopValue, onCardClick, shakeCardId }: PyramidBoardProps) {
  return (
    <div className="w-full max-w-md mx-auto px-2">
      <div className="flex justify-center gap-1">
        {pyramids.map((peak, peakIndex) => (
          <div key={peakIndex} className="flex-1">
            <PeakPyramid
              nodes={peak.filter(n => n.row < 3)}
              onCardClick={onCardClick}
              shakeCardId={shakeCardId}
              peakIndex={peakIndex}
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-1">
        <div className="flex gap-0.5">
          {pyramids.flatMap((peak, peakIndex) => 
            peak
              .filter(n => n.row === 3)
              .map((node, idx) => {
                if (!node.card) return <div key={`empty-${peakIndex}-${idx}`} className="w-12 h-16" />;
                
                const isCovered = !node.card.isPlayable;
                
                return (
                  <PlayingCard
                    key={node.card.id}
                    card={node.card}
                    isPlayable={node.card.isPlayable}
                    isCovered={isCovered}
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
  onCardClick: (cardId: string) => void;
  shakeCardId: string | null;
  peakIndex: number;
}

function PeakPyramid({ nodes, onCardClick, shakeCardId }: PeakPyramidProps) {
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
          style={{ marginTop: rowIndex === 0 ? 0 : -10 }}
        >
          {row.map((node, idx) => {
            if (!node.card) {
              return <div key={`empty-${rowIndex}-${idx}`} className="w-12 h-16" />;
            }

            const isCovered = !node.card.isPlayable;

            return (
              <PlayingCard
                key={node.card.id}
                card={node.card}
                isPlayable={node.card.isPlayable}
                isCovered={isCovered}
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
