const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  // Enhanced CORS for development/production
  const allowedOrigins = [
    'https://68053a953d49e78c540773f1--livelocationtrackertest.netlify.app',
    'http://localhost:3000' // For local testing
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('OK');
    return;
  }

  res.writeHead(404).end();
});

// WebSocket Server with connection timeout
const wss = new WebSocket.Server({
  server,
  clientTracking: true,
  perMessageDeflate: true // Reduce bandwidth
});

const users = new Map();

wss.on('connection', (ws, req) => {
  const userId = Math.random().toString(36).substring(2, 9);
  const ip = req.socket.remoteAddress;
  
  users.set(userId, { 
    ws, 
    ip,
    location: null, 
    lastActive: Date.now() 
  });

  console.log(`User ${userId} connected from ${ip}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'location_update') {
        users.get(userId).location = { 
          lng: data.lng, 
          lat: data.lat,
          accuracy: data.accuracy || 0
        };
        users.get(userId).lastActive = Date.now();
        broadcastLocations();
      }
    } catch (error) {
      console.error(`User ${userId} send invalid data:`, error.message);
    }
  });

  ws.on('pong', () => {
    users.get(userId).lastActive = Date.now();
  });

  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    users.delete(userId);
    broadcastLocations();
  });
});

// Heartbeat and cleanup
setInterval(() => {
  const now = Date.now();
  wss.clients.forEach((client) => {
    const userId = [...users.entries()].find(([_, u]) => u.ws === client)?.[0];
    if (now - users.get(userId)?.lastActive > 120000) {
      client.terminate();
      console.log(`User ${userId} timed out`);
    } else if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000); // Check every 30 seconds

function broadcastLocations() {
  const activeUsers = Array.from(users.entries())
    .filter(([_, user]) => user.location)
    .map(([id, user]) => ({
      id,
      lng: user.location.lng,
      lat: user.location.lat,
      accuracy: user.location.accuracy,
      lastUpdate: user.lastActive
    }));

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'user_locations',
        users: activeUsers,
        serverTime: Date.now()
      }));
    }
  });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket: wss://live-location-tracker-test-lup.railway.app`);
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