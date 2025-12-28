let socket: WebSocket | null = null;
let connectionPromise: Promise<WebSocket> | null = null;

export function getSocket(): WebSocket {
  if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
    return socket;
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
  console.log('[WebSocket] Creating new connection to:', wsUrl);
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('[WebSocket] Connection opened');
  };
  
  socket.onerror = (e) => {
    console.error('[WebSocket] Connection error:', e);
  };
  
  socket.onclose = (e) => {
    console.log('[WebSocket] Connection closed:', e.code, e.reason);
  };
  
  return socket;
}

export function waitForConnection(): Promise<WebSocket> {
  const sock = getSocket();
  
  if (sock.readyState === WebSocket.OPEN) {
    console.log('[WebSocket] Already connected');
    return Promise.resolve(sock);
  }
  
  if (sock.readyState === WebSocket.CONNECTING) {
    console.log('[WebSocket] Waiting for connection...');
  }
  
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('[WebSocket] Connection timeout after 10s');
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    const onOpen = () => {
      console.log('[WebSocket] waitForConnection: Connection established');
      clearTimeout(timeout);
      sock.removeEventListener('open', onOpen);
      sock.removeEventListener('error', onError);
      connectionPromise = null;
      resolve(sock);
    };
    
    const onError = (e: Event) => {
      console.error('[WebSocket] waitForConnection: Connection error');
      clearTimeout(timeout);
      sock.removeEventListener('open', onOpen);
      sock.removeEventListener('error', onError);
      connectionPromise = null;
      reject(e);
    };
    
    sock.addEventListener('open', onOpen);
    sock.addEventListener('error', onError);
  });
  
  return connectionPromise;
}

export function resetSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
  connectionPromise = null;
}
