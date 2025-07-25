export const connectWebSocket = (url) => {
    const socket = new WebSocket(url);

    socket.onopen = () => console.log('WebSocket connected');
    socket.onmessage = (event) => console.log('Message received:', event.data);
    socket.onclose = () => console.log('WebSocket disconnected');

    return socket;
};
