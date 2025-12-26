import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

interface ComboIndicatorProps {
  combo: number;
}

export function ComboIndicator({ combo }: ComboIndicatorProps) {
  if (combo <= 1) return null;

  const isHigh = combo >= 5;
  const isVeryHigh = combo >= 10;

  return (
    <AnimatePresence>
      <motion.div
        key={combo}
        initial={{ scale: 0.5, opacity: 0, y: -20 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          y: 0
        }}
        exit={{ scale: 0.5, opacity: 0, y: 20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-30"
      >
        <motion.div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
            isVeryHigh 
              ? 'bg-gradient-to-r from-amber-500/30 to-red-500/30 border-amber-400/60' 
              : isHigh 
                ? 'bg-gradient-to-r from-cyan-500/30 to-amber-500/30 border-cyan-400/60'
                : 'bg-cyan-500/20 border-cyan-400/40'
          }`}
          animate={isHigh ? {
            boxShadow: [
              '0 0 10px rgba(0, 245, 255, 0.4)',
              '0 0 25px rgba(0, 245, 255, 0.6)',
              '0 0 10px rgba(0, 245, 255, 0.4)'
            ]
          } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          {isHigh && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              <Flame className={`w-5 h-5 ${isVeryHigh ? 'text-amber-400' : 'text-cyan-400'}`} />
            </motion.div>
          )}
          <span 
            className={`font-bold text-lg ${
              isVeryHigh ? 'text-amber-400' : isHigh ? 'text-cyan-300' : 'text-cyan-400'
            }`}
          >
            x{combo} COMBO!
          </span>
          {isHigh && (
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              <Flame className={`w-5 h-5 ${isVeryHigh ? 'text-amber-400' : 'text-cyan-400'}`} />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
