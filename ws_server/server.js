const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("MyHealth WebRTC Signaling Server running on ws://localhost:8080");
});

// Store connected clients grouped by room (appointment_id)
const rooms = {};

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 1. Join Room
      if (data.type === 'join') {
        currentRoom = data.appointment_id;
        userId = data.user_id;
        
        if (!rooms[currentRoom]) {
          rooms[currentRoom] = new Set();
        }
        rooms[currentRoom].add(ws);
        console.log(`User ${userId} joined room ${currentRoom}. Total: ${rooms[currentRoom].size}`);
        
        // If two people are in the room, notify them to start
        if (rooms[currentRoom].size === 2) {
          broadcast(currentRoom, ws, { type: 'ready' });
        }
        return;
      }

      // 2. Relay Signaling Data (offer, answer, ice-candidate)
      if (currentRoom && (data.type === 'offer' || data.type === 'answer' || data.type === 'ice-candidate')) {
        console.log(`Relaying ${data.type} in room ${currentRoom}`);
        broadcast(currentRoom, ws, data);
      }

      // 3. End Call
      if (currentRoom && data.type === 'end-call') {
        console.log(`Call ended in room ${currentRoom}`);
        broadcast(currentRoom, ws, { type: 'end-call' });
      }

    } catch (e) {
      console.error("Invalid JSON message:", e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].delete(ws);
      console.log(`User ${userId} left room ${currentRoom}. Total: ${rooms[currentRoom].size}`);
      broadcast(currentRoom, ws, { type: 'peer-disconnected' });
      
      if (rooms[currentRoom].size === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

// Helper to broadcast to everyone in the room EXCEPT the sender
function broadcast(room, sender, messageObj) {
  if (rooms[room]) {
    const payload = JSON.stringify(messageObj);
    rooms[room].forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
