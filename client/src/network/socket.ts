let socket: WebSocket | null = null;

export function getSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
    socket = new WebSocket(wsUrl);
  }
  return socket;
}
