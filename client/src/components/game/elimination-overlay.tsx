import { motion } from "framer-motion";
import { Skull, Eye } from "lucide-react";

interface EliminationOverlayProps {
  playerName: string;
}

export function EliminationOverlay({ playerName }: EliminationOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl"
      data-testid="elimination-overlay"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
      >
        <Skull className="w-20 h-20 sm:w-24 sm:h-24 text-white/90 mb-3" />
      </motion.div>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-white/90 text-lg font-bold tracking-wide"
      >
        AUSGESCHIEDEN
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 mt-3 text-white/60 text-sm"
      >
        <Eye className="w-4 h-4" />
        <span>Zuschauer-Modus</span>
      </motion.div>
    </motion.div>
  );
}
