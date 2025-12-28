import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, Users, Check, Crown, Play, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getSocket, waitForConnection, setMessageHandler, saveRoomSession, getRoomSession, clearRoomSession } from "@/network/socket";
import type { MultiplayerRoom, MultiplayerPlayer } from "@shared/schema";

function MagicalParticles() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  
  const particleCount = isMobile ? 6 : 15;
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 4,
    size: 2 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(34, 211, 238, 0.5), transparent)`,
          }}
          initial={{ bottom: -20, opacity: 0 }}
          animate={{
            bottom: ['0%', '100%'],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

type LobbyView = 'menu' | 'creating' | 'joining' | 'waiting';

export default function LobbyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [view, setView] = useState<LobbyView>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const addDebugLog = useCallback((msg: string) => {
    setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      setView('joining');
    } else {
      // Check for saved session and try to rejoin
      const session = getRoomSession();
      if (session) {
        addDebugLog(`Found session: ${session.roomCode}`);
        setPlayerName(session.playerName);
        setRoomCode(session.roomCode);
        // Auto-rejoin after socket connects
        const tryRejoin = async () => {
          try {
            const socket = await waitForConnection();
            addDebugLog(`Attempting rejoin to ${session.roomCode}`);
            socket.send(JSON.stringify({
              type: 'rejoin_room',
              payload: {
                playerId: session.playerId,
                roomCode: session.roomCode,
                playerName: session.playerName
              }
            }));
          } catch (e) {
            addDebugLog(`Rejoin failed: ${e}`);
            clearRoomSession();
          }
        };
        tryRejoin();
      }
    }
  }, [addDebugLog]);
  
  useEffect(() => {
    addDebugLog('Setting up message handler');
    
    const handleMessage = (message: any) => {
      addDebugLog(`Received: ${message.type}`);
      switch (message.type) {
        case 'room_created':
        case 'room_joined':
          setRoom(message.payload.room);
          setPlayerId(message.payload.playerId);
          setView('waiting');
          setIsConnecting(false);
          // Save session for auto-rejoin
          const myPlayer = message.payload.room.players.find((p: any) => p.id === message.payload.playerId);
          if (myPlayer) {
            saveRoomSession(message.payload.playerId, myPlayer.name, message.payload.room.code);
            addDebugLog(`Session saved: ${message.payload.room.code}`);
          }
          break;
        case 'room_update':
          setRoom(message.payload.room);
          break;
        case 'game_started':
          setLocation(`/multiplayer-game?room=${message.payload.roomCode}&player=${message.payload.playerId}&seed=${message.payload.seed}&round=${message.payload.currentRound || 1}&totalRounds=${message.payload.totalRounds || 10}&roundTime=${message.payload.roundTimeLimit || 60}`);
          break;
        case 'error':
          toast({
            title: "Fehler",
            description: message.payload.message,
            variant: "destructive"
          });
          setIsConnecting(false);
          // Clear session if room not found
          if (message.payload.message === 'Raum nicht gefunden') {
            clearRoomSession();
            addDebugLog('Session cleared (room not found)');
          }
          break;
      }
    };
    
    setMessageHandler(handleMessage);
    
    const socket = getSocket();
    socketRef.current = socket;
    
    if (socket.readyState === WebSocket.OPEN) {
      setWsConnected(true);
      addDebugLog('Socket already open');
    } else {
      addDebugLog(`Socket state: ${socket.readyState}`);
    }
    
    return () => {
      setMessageHandler(() => {});
    };
  }, [setLocation, toast, addDebugLog]);

  const sendMessage = (msg: object) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name erforderlich",
        description: "Bitte gib deinen Spielernamen ein.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    addDebugLog('Connecting...');
    
    try {
      const socket = await waitForConnection();
      socketRef.current = socket;
      addDebugLog(`Connected, state: ${socket.readyState}`);
      socket.send(JSON.stringify({
        type: 'create_room',
        payload: { playerName: playerName.trim() }
      }));
      addDebugLog('create_room sent');
    } catch (error) {
      addDebugLog(`Error: ${error}`);
      toast({
        title: "Verbindungsfehler",
        description: "Konnte keine Verbindung zum Server herstellen.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name erforderlich",
        description: "Bitte gib deinen Spielernamen ein.",
        variant: "destructive"
      });
      return;
    }

    if (!roomCode.trim() || roomCode.length < 4) {
      toast({
        title: "Code erforderlich",
        description: "Bitte gib einen gultigen Raum-Code ein.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      const socket = await waitForConnection();
      socketRef.current = socket;
      socket.send(JSON.stringify({
        type: 'join_room',
        payload: { 
          playerName: playerName.trim(),
          roomCode: roomCode.toUpperCase().trim()
        }
      }));
    } catch (error) {
      console.error('[Lobby] Connection failed:', error);
      toast({
        title: "Verbindungsfehler",
        description: "Konnte keine Verbindung zum Server herstellen.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const handleToggleReady = () => {
    sendMessage({
      type: 'set_ready',
      payload: { playerId }
    });
  };

  const handleStartGame = () => {
    sendMessage({
      type: 'start_game',
      payload: { playerId }
    });
  };

  const handleLeaveRoom = () => {
    sendMessage({
      type: 'leave_room',
      payload: { playerId }
    });
    clearRoomSession();
    setRoom(null);
    setPlayerId(null);
    setView('menu');
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to fallback
      }
    }
    // Fallback for HTTP / older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  };

  const copyRoomCode = async () => {
    if (room) {
      const success = await copyToClipboard(room.code);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast({
          title: "Kopieren fehlgeschlagen",
          description: `Code: ${room.code}`,
          variant: "destructive"
        });
      }
    }
  };

  const copyInviteLink = async () => {
    if (room) {
      const inviteUrl = `${window.location.origin}/lobby?join=${room.code}`;
      const success = await copyToClipboard(inviteUrl);
      if (success) {
        toast({
          title: "Link kopiert!",
          description: "Einladungslink wurde in die Zwischenablage kopiert.",
        });
      } else {
        toast({
          title: "Kopieren fehlgeschlagen",
          description: inviteUrl,
          variant: "destructive"
        });
      }
    }
  };

  const currentPlayer = room?.players.find(p => p.id === playerId);
  const allPlayersReady = room?.players.every(p => p.isReady) ?? false;
  const canStart = currentPlayer?.isHost && allPlayersReady && (room?.players.length ?? 0) >= 2;

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative"
      style={{ 
        background: 'radial-gradient(ellipse at center, #001428 0%, #000814 50%, #000510 100%)'
      }}
    >
      <MagicalParticles />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34, 211, 238, 0.08), transparent)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08), transparent)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Button
          variant="ghost"
          onClick={() => view === 'waiting' ? handleLeaveRoom() : setLocation('/')}
          className="mb-4 text-gray-400 hover:text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zuruck
        </Button>

        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h1 
                className="text-3xl font-bold text-center mb-8"
                style={{ 
                  color: '#D4AF37',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
                }}
              >
                Multiplayer
              </h1>

              <div className="space-y-4">
                <Input
                  placeholder="Dein Spielername"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="h-14 text-lg bg-[#001020] border-amber-500/30 text-white placeholder:text-gray-500"
                  maxLength={15}
                  data-testid="input-player-name"
                />

                <Button
                  size="lg"
                  onClick={() => setView('creating')}
                  className="w-full h-14 text-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 border-2 border-cyan-400/50"
                  data-testid="button-create-room"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Raum erstellen
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setView('joining')}
                  className="w-full h-14 text-lg border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  data-testid="button-join-room"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Raum beitreten
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'creating' && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-center mb-6 text-cyan-400">
                Raum erstellen
              </h2>

              <div className="space-y-4">
                <Input
                  placeholder="Dein Spielername"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="h-14 text-lg bg-[#001020] border-cyan-500/30 text-white placeholder:text-gray-500"
                  maxLength={15}
                  data-testid="input-create-name"
                />

                <Button
                  size="lg"
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full h-14 text-lg bg-gradient-to-r from-cyan-600 to-cyan-500"
                  data-testid="button-confirm-create"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Crown className="w-5 h-5 mr-2" />
                  )}
                  {isConnecting ? 'Verbinde...' : 'Raum offnen'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setView('menu')}
                  className="w-full text-gray-400"
                >
                  Abbrechen
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'joining' && (
            <motion.div
              key="joining"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-center mb-6 text-amber-400">
                Raum beitreten
              </h2>

              <div className="space-y-4">
                <Input
                  placeholder="Dein Spielername"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="h-14 text-lg bg-[#001020] border-amber-500/30 text-white placeholder:text-gray-500"
                  maxLength={15}
                  data-testid="input-join-name"
                />

                <Input
                  placeholder="Raum-Code eingeben"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="h-14 text-lg text-center font-mono tracking-widest bg-[#001020] border-amber-500/30 text-white placeholder:text-gray-500"
                  maxLength={6}
                  data-testid="input-room-code"
                />

                <Button
                  size="lg"
                  onClick={handleJoinRoom}
                  disabled={isConnecting}
                  className="w-full h-14 text-lg bg-gradient-to-r from-amber-600 to-amber-500"
                  data-testid="button-confirm-join"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Users className="w-5 h-5 mr-2" />
                  )}
                  {isConnecting ? 'Verbinde...' : 'Beitreten'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setView('menu')}
                  className="w-full text-gray-400"
                >
                  Abbrechen
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'waiting' && room && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-cyan-500/30" style={{ background: 'rgba(0, 20, 40, 0.9)' }}>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-cyan-400">Warteraum</CardTitle>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span 
                      className="text-3xl font-mono tracking-widest"
                      style={{ color: '#D4AF37' }}
                    >
                      {room.code}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={copyRoomCode}
                      className="text-gray-400 hover:text-white"
                      data-testid="button-copy-code"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyInviteLink}
                    className="mt-2 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/10"
                    data-testid="button-copy-link"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Einladungslink kopieren
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>Spieler ({room.players.length}/6)</span>
                    </div>
                    {room.players.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          player.id === playerId 
                            ? 'bg-cyan-500/10 border border-cyan-500/30' 
                            : 'bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {player.isHost && <Crown className="w-4 h-4 text-amber-400" />}
                          <span className="text-white font-medium">{player.name}</span>
                          {player.id === playerId && (
                            <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                              Du
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant={player.isReady ? "default" : "outline"}
                          className={player.isReady 
                            ? "bg-green-500/20 text-green-400 border-green-500/50" 
                            : "text-gray-400 border-gray-500/50"
                          }
                        >
                          {player.isReady ? "Bereit" : "Wartet"}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      size="lg"
                      onClick={handleToggleReady}
                      className={`w-full ${
                        currentPlayer?.isReady 
                          ? 'bg-gray-600 hover:bg-gray-500' 
                          : 'bg-green-600 hover:bg-green-500'
                      }`}
                      data-testid="button-ready"
                    >
                      {currentPlayer?.isReady ? 'Nicht bereit' : 'Bereit'}
                    </Button>

                    {currentPlayer?.isHost && (
                      <Button
                        size="lg"
                        onClick={handleStartGame}
                        disabled={!canStart}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 disabled:opacity-50"
                        data-testid="button-start-game"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Spiel starten
                      </Button>
                    )}

                    {!canStart && currentPlayer?.isHost && (
                      <p className="text-xs text-center text-gray-500">
                        {room.players.length < 2 
                          ? "Mindestens 2 Spieler erforderlich" 
                          : "Alle Spieler mussen bereit sein"
                        }
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Debug Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-xs text-green-400 p-2 font-mono max-h-32 overflow-y-auto z-50">
        <div className="font-bold text-yellow-400 mb-1">Debug Log:</div>
        {debugLog.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
