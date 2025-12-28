type MessageHandler = (message: { type: string; payload?: any }) => void;

let wsRef: WebSocket | null = null;
let messageHandlers: Set<MessageHandler> = new Set();
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

let storedPlayerId: string | null = null;
let storedRoomCode: string | null = null;

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function handleOpen() {
  console.log('[WS Singleton] Connected');
  reconnectAttempts = 0;
  
  if (storedPlayerId && storedRoomCode) {
    console.log('[WS Singleton] Auto-rejoining room:', storedRoomCode);
    send({
      type: 'rejoin_game',
      payload: { roomCode: storedRoomCode, playerId: storedPlayerId }
    });
  }
}

function handleMessage(event: MessageEvent) {
  try {
    const message = JSON.parse(event.data);
    messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (e) {
        console.error('[WS Singleton] Handler error:', e);
      }
    });
  } catch (e) {
    console.error('[WS Singleton] Failed to parse message:', e);
  }
}

function handleClose(event: CloseEvent) {
  console.log('[WS Singleton] Disconnected, code:', event.code);
  wsRef = null;
  
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`[WS Singleton] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    reconnectTimeout = setTimeout(() => {
      connect();
    }, RECONNECT_DELAY);
  } else {
    console.log('[WS Singleton] Max reconnect attempts reached');
  }
}

function handleError(event: Event) {
  console.error('[WS Singleton] Error:', event);
}

export function connect(): WebSocket {
  if (wsRef && wsRef.readyState === WebSocket.OPEN) {
    return wsRef;
  }
  
  if (wsRef && wsRef.readyState === WebSocket.CONNECTING) {
    return wsRef;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  const url = getWsUrl();
  console.log('[WS Singleton] Connecting to:', url);
  
  wsRef = new WebSocket(url);
  wsRef.onopen = handleOpen;
  wsRef.onmessage = handleMessage;
  wsRef.onclose = handleClose;
  wsRef.onerror = handleError;
  
  return wsRef;
}

export function getSocket(): WebSocket {
  if (!wsRef || wsRef.readyState === WebSocket.CLOSED || wsRef.readyState === WebSocket.CLOSING) {
    return connect();
  }
  return wsRef;
}

export function ensureConnected(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    
    if (socket.readyState === WebSocket.OPEN) {
      resolve(socket);
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);
    
    const onOpen = () => {
      clearTimeout(timeout);
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
      resolve(socket);
    };
    
    const onError = () => {
      clearTimeout(timeout);
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
      reject(new Error('Connection failed'));
    };
    
    socket.addEventListener('open', onOpen);
    socket.addEventListener('error', onError);
  });
}

export function send(message: { type: string; payload?: any }): boolean {
  const socket = getSocket();
  
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  }
  
  console.warn('[WS Singleton] Cannot send, socket not open. State:', socket.readyState);
  return false;
}

export function addMessageHandler(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => {
    messageHandlers.delete(handler);
  };
}

export function setCredentials(playerId: string | null, roomCode: string | null) {
  storedPlayerId = playerId;
  storedRoomCode = roomCode;
  console.log('[WS Singleton] Credentials set:', { playerId, roomCode });
}

export function getCredentials(): { playerId: string | null; roomCode: string | null } {
  return { playerId: storedPlayerId, roomCode: storedRoomCode };
}

export function clearCredentials() {
  storedPlayerId = null;
  storedRoomCode = null;
  console.log('[WS Singleton] Credentials cleared');
}

export function isConnected(): boolean {
  return wsRef !== null && wsRef.readyState === WebSocket.OPEN;
}

export function resetReconnectAttempts() {
  reconnectAttempts = 0;
}
