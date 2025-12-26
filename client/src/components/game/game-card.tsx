import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, Minus, Heart, Diamond, Club, Spade } from "lucide-react";
import type { Card, ActionCard } from "@shared/schema";

interface TowerCardProps {
  card: Card;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const suitIcons = {
  hearts: Heart,
  diamonds: Diamond,
  clubs: Club,
  spades: Spade,
};

const suitColors = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-foreground",
  spades: "text-foreground",
};

export function TowerCard({ 
  card, 
  isSelected, 
  isDisabled, 
  onClick,
  className 
}: TowerCardProps) {
  const SuitIcon = suitIcons[card.suit];

  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.05, y: -4 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      onClick={!isDisabled ? onClick : undefined}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32",
        "rounded-xl cursor-pointer select-none",
        "bg-card border-2 shadow-md",
        "transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary",
        isDisabled && "opacity-50 cursor-not-allowed grayscale",
        !isSelected && !isDisabled && "border-card-border hover:border-primary/50",
        className
      )}
      data-testid={`tower-card-${card.id}`}
    >
      <div className={cn("absolute top-1.5 left-2 flex flex-col items-center", suitColors[card.suit])}>
        <span className="text-sm font-bold leading-none">{card.value}</span>
        <SuitIcon className="w-3 h-3 fill-current" />
      </div>
      
      <span className={cn("text-3xl sm:text-4xl md:text-5xl font-bold", suitColors[card.suit])}>
        {card.value}
      </span>
      
      <div className={cn("absolute bottom-1.5 right-2 flex flex-col items-center rotate-180", suitColors[card.suit])}>
        <span className="text-sm font-bold leading-none">{card.value}</span>
        <SuitIcon className="w-3 h-3 fill-current" />
      </div>
    </motion.div>
  );
}

interface ActionCardComponentProps {
  card: ActionCard;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ActionCardComponent({ 
  card, 
  isSelected, 
  isDisabled, 
  onClick,
  className 
}: ActionCardComponentProps) {
  const isPlus = card.type === 'plus';

  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.08, y: -6 } : undefined}
      whileTap={!isDisabled ? { scale: 0.95 } : undefined}
      onClick={!isDisabled ? onClick : undefined}
      className={cn(
        "relative flex items-center justify-center",
        "w-14 h-20 sm:w-16 sm:h-22 md:w-18 md:h-24",
        "rounded-xl cursor-pointer select-none",
        "shadow-lg transition-all duration-200",
        isPlus 
          ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white" 
          : "bg-gradient-to-br from-rose-500 to-red-600 text-white",
        isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background scale-110",
        isDisabled && "opacity-40 cursor-not-allowed",
        className
      )}
      data-testid={`action-card-${card.id}`}
    >
      {isPlus ? (
        <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={3} />
      ) : (
        <Minus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={3} />
      )}
      
      <motion.div
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className="text-xs font-bold">1</span>
      </motion.div>
    </motion.div>
  );
}
