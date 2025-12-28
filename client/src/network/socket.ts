let socket: WebSocket | null = null;

export function getSocket(): WebSocket {
  if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
    return socket;
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
  console.log('[WebSocket] Creating new connection to:', wsUrl);
  
  socket = new WebSocket(wsUrl);
  
  return socket;
}

export function waitForConnection(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const sock = getSocket();
    
    console.log('[WebSocket] waitForConnection called, readyState:', sock.readyState);
    
    if (sock.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      resolve(sock);
      return;
    }
    
    const timeout = setTimeout(() => {
      console.error('[WebSocket] Connection timeout after 10s');
      sock.removeEventListener('open', onOpen);
      sock.removeEventListener('error', onError);
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    const onOpen = () => {
      console.log('[WebSocket] Connection established in waitForConnection');
      clearTimeout(timeout);
      sock.removeEventListener('open', onOpen);
      sock.removeEventListener('error', onError);
      resolve(sock);
    };
    
    const onError = (e: Event) => {
      console.error('[WebSocket] Connection error in waitForConnection');
      clearTimeout(timeout);
      sock.removeEventListener('open', onOpen);
      sock.removeEventListener('error', onError);
      reject(e);
    };
    
    sock.addEventListener('open', onOpen);
    sock.addEventListener('error', onError);
  });
}

export function resetSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
