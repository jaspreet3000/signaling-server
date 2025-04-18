wss.on('connection', socket => {
     socket.on('message', message => {
         let data = JSON.parse(message);
         const { type, room, payload } = data;
         try {
             const data = JSON.parse(message);
             console.log("Received:", data); // Debug log
 
         if (type === 'join') {
             rooms[room] = rooms[room] || [];
             rooms[room].push(socket);
             socket.room = room;
         }
             // Handle join messages separately
             if (data.type === 'join') {
                 rooms[data.roomId] = rooms[data.roomId] || [];
                 rooms[data.roomId].push(socket);
                 socket.room = data.roomId;
                 return;
             }
 
         rooms[room]?.forEach(client => {
             if (client !== socket) {
                 client.send(JSON.stringify({ type, payload }));
             // Forward all other messages as-is to room members
             if (socket.room && rooms[socket.room]) {
                 rooms[socket.room].forEach(client => {
                     if (client !== socket && client.readyState === WebSocket.OPEN) {
                         console.log("Forwarding:", data); // Debug log
                         client.send(JSON.stringify(data));
                     }
                 });
             }
         });
         } catch (error) {
             console.error("Error handling message:", error);
         }
     });
 
     socket.on('close', () => {
         if (socket.room && rooms[socket.room]) {
             rooms[socket.room] = rooms[socket.room].filter(s => s !== socket);
             if (rooms[socket.room].length === 0) {
                 delete rooms[socket.room];
             }
         }
     });
 });
