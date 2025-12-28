let socket: WebSocket | null = null;
let isConnected = false;
let connectionCallbacks: Array<(sock: WebSocket) => void> = [];
let messageHandler: ((data: any) => void) | null = null;

export function setMessageHandler(handler: (data: any) => void) {
  messageHandler = handler;
}

export function getSocket(): WebSocket {
  if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
    return socket;
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
  console.log('[WebSocket] Creating new connection to:', wsUrl);
  
  isConnected = false;
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('[WebSocket] Connection opened');
    isConnected = true;
    connectionCallbacks.forEach(cb => cb(socket!));
    connectionCallbacks = [];
  };
  
  socket.onmessage = (event: MessageEvent) => {
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
  
  socket.onerror = (e) => {
    console.error('[WebSocket] Error:', e);
  };
  
  socket.onclose = (e) => {
    console.log('[WebSocket] Connection closed:', e.code, e.reason);
    isConnected = false;
  };
  
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
