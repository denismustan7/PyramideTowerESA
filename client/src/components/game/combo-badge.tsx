import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface ComboBadgeProps {
  combo: number;
  className?: string;
}

export function ComboBadge({ combo, className }: ComboBadgeProps) {
  if (combo <= 1) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={combo}
        initial={{ scale: 0.5, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className={`absolute -top-2 right-2 flex items-center gap-1 px-3 py-1 rounded-full 
          bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm
          shadow-lg shadow-amber-500/30 ${className}`}
        data-testid={`combo-badge-${combo}`}
      >
        <Zap className="w-4 h-4 fill-current" />
        <span>x{combo}</span>
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs font-semibold ml-1"
        >
          COMBO!
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
