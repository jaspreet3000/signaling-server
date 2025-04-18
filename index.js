const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const server = new WebSocket.Server({ port: PORT }, () => {
    console.log(`Signaling server running on port ${PORT}`);
});

const rooms = new Map(); // roomId -> Set of sockets

server.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'create':
                case 'join':
                    currentRoom = data.roomId;
                    if (!rooms.has(currentRoom)) {
                        rooms.set(currentRoom, new Set());
                    }
                    rooms.get(currentRoom).add(socket);
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                case 'notification':
                    broadcastToRoom(currentRoom, socket, message);
                    break;

                case 'leave':
                    removeFromRoom(currentRoom, socket);
                    break;
            }
        } catch (err) {
            console.error('Invalid message:', message);
        }
    });

    socket.on('close', () => {
        removeFromRoom(currentRoom, socket);
    });
});

function broadcastToRoom(roomId, senderSocket, message) {
    const clients = rooms.get(roomId);
    if (clients) {
        for (const client of clients) {
            if (client !== senderSocket && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}

function removeFromRoom(roomId, socket) {
    if (!roomId || !rooms.has(roomId)) return;
    const clients = rooms.get(roomId);
    clients.delete(socket);
    if (clients.size === 0) {
        rooms.delete(roomId);
    }
}
