import { motion } from "framer-motion";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RoomCodeCardProps {
  code: string;
}

export function RoomCodeCard({ code }: RoomCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const shareRoom = async () => {
    const shareUrl = `${window.location.origin}?room=${code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Magic Tower Spiel',
          text: `Tritt meinem Spiel bei! Raumcode: ${code}`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/50 rounded-xl p-6 text-center border border-border"
      data-testid="room-code-card"
    >
      <p className="text-sm text-muted-foreground mb-2">Raumcode</p>
      <div className="flex items-center justify-center gap-3 mb-4">
        <motion.span
          className="text-4xl font-mono font-bold tracking-widest"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          data-testid="room-code-display"
        >
          {code}
        </motion.span>
        <Button
          variant="ghost"
          size="icon"
          onClick={copyCode}
          data-testid="button-copy-code"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <Copy className="w-5 h-5" />
          )}
        </Button>
      </div>
      
      <Button
        onClick={shareRoom}
        variant="outline"
        className="w-full"
        data-testid="button-share-room"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Freunde einladen
      </Button>
    </motion.div>
  );
}
