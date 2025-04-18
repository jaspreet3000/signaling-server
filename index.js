const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });
const rooms = {};

wss.on('connection', socket => {
    socket.on('message', message => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'join') {
                rooms[data.roomId] = rooms[data.roomId] || [];
                rooms[data.roomId].push(socket);
                socket.room = data.roomId;
                socket.userId = data.userId;
                socket.userName = data.userName || 'Guest';
                
                // Notify others about new user
                rooms[data.roomId].forEach(client => {
                    if (client !== socket && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "user-joined",
                            userId: data.userId,
                            userName: data.userName
                        }));
                    }
                });
                return;
            }

            // Forward chat messages
            if (data.type === 'chat') {
                rooms[socket.room].forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "chat",
                            text: data.text,
                            userId: socket.userId,
                            userName: socket.userName,
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    });

    socket.on('close', () => {
        if (socket.room && rooms[socket.room]) {
            // Notify others about disconnection
            rooms[socket.room].forEach(client => {
                if (client !== socket && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "user-left",
                        userId: socket.userId,
                        userName: socket.userName
                    }));
                }
            });
            
            // Remove from room
            rooms[socket.room] = rooms[socket.room].filter(s => s !== socket);
        }
    });
});
