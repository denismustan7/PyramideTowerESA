let socket: WebSocket | null = null;

export function getSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
    socket = new WebSocket(wsUrl);
  }
  return socket;
}
