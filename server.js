const WebSocket = require('ws');
const http = require('http');

// Create HTTP server with health check
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end();
});

// WebSocket Server
const wss = new WebSocket.Server({ server, path: '/' });

const users = new Map();

wss.on('connection', (ws) => {
  const userId = Math.random().toString(36).substring(2, 9);
  users.set(userId, { ws, location: null, lastActive: Date.now() });

  console.log(`User ${userId} connected`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'location_update') {
        users.get(userId).location = { 
          lng: data.lng, 
          lat: data.lat,
          accuracy: data.accuracy || null
        };
        users.get(userId).lastActive = Date.now();
        broadcastLocations();
      }
    } catch (error) {
      console.error('Message parse error:', error);
    }
  });

  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    users.delete(userId);
    broadcastLocations();
  });
});

// Clean inactive connections every 2 minutes
setInterval(() => {
  const now = Date.now();
  users.forEach((user, userId) => {
    if (now - user.lastActive > 120000) { // 2 minutes
      user.ws.terminate();
      users.delete(userId);
      console.log(`User ${userId} timed out`);
    }
  });
}, 60000);

function broadcastLocations() {
  const activeUsers = Array.from(users.entries())
    .filter(([_, user]) => user.location)
    .map(([id, user]) => ({
      id,
      lng: user.location.lng,
      lat: user.location.lat,
      accuracy: user.location.accuracy
    }));

  users.forEach(user => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify({
        type: 'user_locations',
        users: activeUsers,
        timestamp: Date.now()
      }));
    }
  });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket: wss://live-location-tracker-test-lup.railway.app`);
});

// const WebSocket = require('ws');
// const http = require('http');

// // Create HTTP server for Railway compatibility
// const server = http.createServer();
// const wss = new WebSocket.Server({ server }); // Attach WebSocket to HTTP server

// const users = new Map();

// // Basic HTTP route for Railway health checks
// server.get('/health', (req, res) => {
//   res.status(200).send('OK');
// });

// wss.on('connection', (ws) => {
//     const userId = Math.random().toString(36).substring(2, 9);
//     users.set(userId, { ws, location: null, lastUpdate: Date.now() });

//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message);
//             if (data.type === 'location_update') {
//                 users.get(userId).location = { 
//                     lng: data.lng, 
//                     lat: data.lat,
//                     accuracy: data.accuracy || null
//                 };
//                 users.get(userId).lastUpdate = Date.now();
//                 broadcastLocations();
//             }
//         } catch (error) {
//             console.error('Message parse error:', error);
//         }
//     });

//     ws.on('close', () => {
//         users.delete(userId);
//         broadcastLocations();
//     });
// });

// // Cleanup inactive connections every 5 minutes
// setInterval(() => {
//     const now = Date.now();
//     users.forEach((user, userId) => {
//         if (now - user.lastUpdate > 300000) { // 5 minutes
//             user.ws.terminate();
//             users.delete(userId);
//         }
//     });
// }, 300000);

// function broadcastLocations() {
//     const activeUsers = Array.from(users.entries())
//         .filter(([_, user]) => user.location)
//         .map(([id, user]) => ({
//             id,
//             lng: user.location.lng,
//             lat: user.location.lat,
//             accuracy: user.location.accuracy
//         }));

//     users.forEach(user => {
//         if (user.ws.readyState === WebSocket.OPEN) {
//             user.ws.send(JSON.stringify({
//                 type: 'user_locations',
//                 users: activeUsers,
//                 timestamp: Date.now()
//             }));
//         }
//     });
// }

// const PORT = process.env.PORT || 8080;
// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`WebSocket available at ws://localhost:${PORT}`);
// });

// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 8080 });

// const users = new Map();

// wss.on('connection', (ws) => {
//     const userId = Math.random().toString(36).substring(2, 9);
//     users.set(userId, { ws, location: null });

//     ws.on('message', (message) => {
//         const data = JSON.parse(message);
//         if (data.type === 'location_update') {
//             users.get(userId).location = { lng: data.lng, lat: data.lat };
//             broadcastLocations();
//         }
//     });

//     ws.on('close', () => {
//         users.delete(userId);
//         broadcastLocations();
//     });
// });

// function broadcastLocations() {
//     const locations = Array.from(users.entries())
//         .filter(([_, user]) => user.location)
//         .map(([id, user]) => ({
//             id,
//             lng: user.location.lng,
//             lat: user.location.lat
//         }));

//     users.forEach(user => {
//         if (user.ws.readyState === WebSocket.OPEN) {
//             user.ws.send(JSON.stringify({ type: 'user_locations', users: locations }));
//         }
//     });
// }