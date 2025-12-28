let socket: WebSocket | null = null;

export function getSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
    console.log('[WebSocket] Connecting to:', wsUrl);
    console.log('[WebSocket] Protocol:', window.location.protocol, '-> WS:', protocol);
    console.log('[WebSocket] Host:', window.location.host);
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => console.log('[WebSocket] Connected successfully');
    socket.onerror = (e) => console.error('[WebSocket] Error:', e);
    socket.onclose = (e) => console.log('[WebSocket] Closed:', e.code, e.reason);
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
