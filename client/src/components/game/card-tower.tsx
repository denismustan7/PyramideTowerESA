import { motion } from "framer-motion";
import { TowerCard } from "./game-card";
import type { Card } from "@shared/schema";

interface CardTowerProps {
  cards: Card[];
  selectedCardId?: string;
  onCardSelect?: (cardId: string) => void;
  isDisabled?: boolean;
}

export function CardTower({ 
  cards, 
  selectedCardId, 
  onCardSelect,
  isDisabled 
}: CardTowerProps) {
  return (
    <div className="flex flex-col-reverse items-center gap-[-20px] py-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            marginTop: index === 0 ? 0 : -40
          }}
          transition={{ 
            delay: index * 0.05,
            type: "spring",
            stiffness: 300
          }}
          style={{
            zIndex: cards.length - index,
          }}
        >
          <TowerCard
            card={card}
            isSelected={selectedCardId === card.id}
            isDisabled={isDisabled}
            onClick={() => onCardSelect?.(card.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}
