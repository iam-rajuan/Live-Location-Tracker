const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const users = new Map();

wss.on('connection', (ws) => {
    const userId = Math.random().toString(36).substring(2, 9);
    users.set(userId, { ws, location: null });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'location_update') {
            users.get(userId).location = { lng: data.lng, lat: data.lat };
            broadcastLocations();
        }
    });

    ws.on('close', () => {
        users.delete(userId);
        broadcastLocations();
    });
});

function broadcastLocations() {
    const locations = Array.from(users.entries())
        .filter(([_, user]) => user.location)
        .map(([id, user]) => ({
            id,
            lng: user.location.lng,
            lat: user.location.lat
        }));

    users.forEach(user => {
        if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify({ type: 'user_locations', users: locations }));
        }
    });
}