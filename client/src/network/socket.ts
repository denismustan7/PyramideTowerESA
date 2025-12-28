let socket: WebSocket | null = null;
let isConnected = false;
let connectionCallbacks: Array<(sock: WebSocket) => void> = [];
let messageHandler: ((data: any) => void) | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

// Store room session for auto-rejoin
interface RoomSession {
  playerId: string;
  playerName: string;
  roomCode: string;
  timestamp: number;
}

export function saveRoomSession(playerId: string, playerName: string, roomCode: string) {
  const session: RoomSession = { playerId, playerName, roomCode, timestamp: Date.now() };
  localStorage.setItem('pyramide_room_session', JSON.stringify(session));
}

export function getRoomSession(): RoomSession | null {
  try {
    const data = localStorage.getItem('pyramide_room_session');
    if (!data) return null;
    const session = JSON.parse(data) as RoomSession;
    // Session expires after 5 minutes
    if (Date.now() - session.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem('pyramide_room_session');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearRoomSession() {
  localStorage.removeItem('pyramide_room_session');
}

export function setMessageHandler(handler: (data: any) => void) {
  messageHandler = handler;
}

function createSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
  console.log('[WebSocket] Creating new connection to:', wsUrl);
  
  isConnected = false;
  const newSocket = new WebSocket(wsUrl);
  
  newSocket.onopen = () => {
    console.log('[WebSocket] Connection opened');
    isConnected = true;
    reconnectAttempts = 0;
    connectionCallbacks.forEach(cb => cb(newSocket));
    connectionCallbacks = [];
  };
  
  newSocket.onmessage = (event: MessageEvent) => {
    console.log('[WebSocket] Raw message received:', event.data.substring(0, 100));
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Parsed message type:', data.type);
      if (messageHandler) {
        messageHandler(data);
      } else {
        console.warn('[WebSocket] No message handler registered');
      }
    } catch (e) {
      console.error('[WebSocket] Failed to parse message:', e);
    }
  };
  
  newSocket.onerror = (e) => {
    console.error('[WebSocket] Error:', e);
  };
  
  newSocket.onclose = (e) => {
    console.log('[WebSocket] Connection closed:', e.code, e.reason);
    isConnected = false;
    
    // Auto-reconnect if not intentionally closed
    if (e.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[WebSocket] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms`);
      
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        console.log('[WebSocket] Attempting reconnect...');
        socket = createSocket();
      }, RECONNECT_DELAY);
    }
  };
  
  return newSocket;
}

export function getSocket(): WebSocket {
  if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
    return socket;
  }
  
  socket = createSocket();
  return socket;
}

export function waitForConnection(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const sock = getSocket();
    
    console.log('[WebSocket] waitForConnection - readyState:', sock.readyState, 'isConnected:', isConnected);
    
    if (sock.readyState === WebSocket.OPEN || isConnected) {
      console.log('[WebSocket] Already connected, resolving immediately');
      resolve(sock);
      return;
    }
    
    const timeout = setTimeout(() => {
      console.error('[WebSocket] Connection timeout after 10s');
      const idx = connectionCallbacks.indexOf(onConnected);
      if (idx > -1) connectionCallbacks.splice(idx, 1);
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    const onConnected = (s: WebSocket) => {
      console.log('[WebSocket] Connection callback fired');
      clearTimeout(timeout);
      resolve(s);
    };
    
    connectionCallbacks.push(onConnected);
  });
}

export function resetSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
  isConnected = false;
  connectionCallbacks = [];
  messageHandler = null;
}
