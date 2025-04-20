const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const server = new WebSocket.Server({ port: PORT }, () => {
    console.log(`Signaling server running on port ${PORT}`);
});

const rooms = new Map(); // roomId -> { owner: WebSocket, participants: Set<WebSocket> }

server.on('connection', (socket) => {
    let currentRoomId = null;
    let isOwner = false;

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'create':
                    currentRoomId = data.roomId;
                    if (!rooms.has(currentRoomId)) {
                        rooms.set(currentRoomId, { owner: socket, participants: new Set() });
                        isOwner = true;
                    }
                    break;

                case 'join':
                    currentRoomId = data.roomId;
                    if (rooms.has(currentRoomId) && rooms.get(currentRoomId).owner !== socket) {
                        rooms.get(currentRoomId).participants.add(socket);
                    }
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                case 'notification':
                    broadcastToRoom(currentRoomId, socket, message);
                    break;

                case 'viewer-status':
                    // Forward viewer status only to the room owner
                    if (currentRoomId && rooms.has(currentRoomId) && !isOwner) {
                        const owner = rooms.get(currentRoomId).owner;
                        if (owner && owner.readyState === WebSocket.OPEN) {
                            owner.send(message); // Send the 'viewer-status' message directly to the owner
                        }
                    }
                    break;

                case 'leave':
                    removeFromRoom(currentRoomId, socket);
                    break;
            }
        } catch (err) {
            console.error('Invalid message:', message);
        }
    });

    socket.on('close', () => {
        removeFromRoom(currentRoomId, socket);
    });
});

function broadcastToRoom(roomId, senderSocket, message) {
    const room = rooms.get(roomId);
    if (room) {
        const clients = new Set([...room.participants, room.owner]); // Include the owner in the broadcast list
        for (const client of clients) {
            if (client !== senderSocket && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}

function removeFromRoom(roomId, socket) {
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (room.owner === socket) {
        // If the owner leaves, close all participants' connections and remove the room
        for (const participant of room.participants) {
            if (participant.readyState === WebSocket.OPEN) {
                participant.close();
            }
        }
        rooms.delete(roomId);
    } else {
        room.participants.delete(socket);
        if (room.participants.size === 0 && room.owner.readyState !== WebSocket.OPEN) {
            rooms.delete(roomId);
        }
    }
}
