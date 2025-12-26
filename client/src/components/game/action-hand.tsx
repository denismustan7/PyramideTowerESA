import { motion } from "framer-motion";
import { ActionCardComponent } from "./game-card";
import type { ActionCard } from "@shared/schema";

interface ActionHandProps {
  cards: ActionCard[];
  selectedCardId?: string;
  onCardSelect?: (cardId: string) => void;
  isDisabled?: boolean;
}

export function ActionHand({ 
  cards, 
  selectedCardId, 
  onCardSelect,
  isDisabled 
}: ActionHandProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-2">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 30, rotate: -10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            rotate: 0
          }}
          transition={{ 
            delay: index * 0.08,
            type: "spring",
            stiffness: 400,
            damping: 20
          }}
        >
          <ActionCardComponent
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
