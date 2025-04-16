const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });
const rooms = {};

// Function to validate Room IDs
function isValidRoomId(roomId) {
    const roomIdRegex = /^[A-Z2-7]{8}$/; // Matches 8 characters in A-Z, 2-7
    return roomIdRegex.test(roomId);
}

wss.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { type, room, payload } = data;

            // Validate Room ID
            if (!isValidRoomId(room)) {
                return socket.send(JSON.stringify({ type: 'error', message: 'Invalid Room ID' }));
            }

            switch (type) {
                case 'join':
                    // Add the client to the room
                    rooms[room] = rooms[room] || [];
                    rooms[room].push(socket);
                    socket.room = room;

                    // Notify other clients in the room
                    broadcastToRoom(room, {
                        type: 'user-joined',
                        payload: { message: 'A new user has joined the room', roomId: room },
                    }, socket);

                    console.log(`Client joined room: ${room}`);
                    break;

                case 'message':
                    // Broadcast the message to other clients in the room
                    broadcastToRoom(room, { type: 'message', payload }, socket);
                    break;

                default:
                    console.log('Unknown message type:', type);
                    socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
            }
        } catch (err) {
            console.error('Error processing message:', err);
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    socket.on('close', () => {
        if (socket.room && rooms[socket.room]) {
            // Remove the client from the room
            rooms[socket.room] = rooms[socket.room].filter((s) => s !== socket);

            // If the room is empty, delete it
            if (rooms[socket.room].length === 0) {
                delete rooms[socket.room];
                console.log(`Room ${socket.room} deleted`);
            } else {
                // Notify remaining clients in the room
                broadcastToRoom(socket.room, {
                    type: 'user-left',
                    payload: { message: 'A user has left the room', roomId: socket.room },
                });
            }
        }
        console.log('Client disconnected');
    });
});

// Helper function to broadcast messages to a room
function broadcastToRoom(room, message, excludeSocket = null) {
    if (rooms[room]) {
        rooms[room].forEach((client) => {
            if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}
