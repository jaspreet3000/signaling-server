const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });
const rooms = {};

wss.on('connection', socket => {
    socket.on('message', message => {
        let data = JSON.parse(message);
        const { type, room, payload } = data;

        if (type === 'join') {
            rooms[room] = rooms[room] || [];
            rooms[room].push(socket);
            socket.room = room;
        }

        rooms[room]?.forEach(client => {
            if (client !== socket) {
                client.send(JSON.stringify({ type, payload }));
            }
        });
    });

    socket.on('close', () => {
        if (socket.room && rooms[socket.room]) {
            rooms[socket.room] = rooms[socket.room].filter(s => s !== socket);
        }
    });
});
