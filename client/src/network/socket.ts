let socket: WebSocket | null = null;
let isConnected = false;
let pendingCallbacks: Array<(sock: WebSocket) => void> = [];

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
    pendingCallbacks.forEach(cb => cb(socket!));
    pendingCallbacks = [];
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
      const idx = pendingCallbacks.indexOf(onConnected);
      if (idx > -1) pendingCallbacks.splice(idx, 1);
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    const onConnected = (s: WebSocket) => {
      console.log('[WebSocket] Connection callback fired');
      clearTimeout(timeout);
      resolve(s);
    };
    
    pendingCallbacks.push(onConnected);
  });
}

export function resetSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
  isConnected = false;
  pendingCallbacks = [];
}
