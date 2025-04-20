// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiaWFtLXJhanVhbiIsImEiOiJjbTlwc21sY2QwOGFqMmtzZmk0bmVmeTY4In0.uump7C1sJdV219uJEDYQuA';

// Initialize Map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [0, 0],
  zoom: 1
});

// WebSocket Connection
const socket = new WebSocket('wss://live-location-tracker-test-lup.railway.app');

// Track all markers
let userMarker = null;
const otherUsers = {}; // Stores { id: marker }

// Connection Handling
socket.onopen = () => {
  console.log('WebSocket connected');
  document.getElementById('status').textContent = 'Connected';
  document.getElementById('status').style.color = 'green';
};

socket.onclose = () => {
  console.log('WebSocket disconnected');
  document.getElementById('status').textContent = 'Disconnected - Reconnecting...';
  document.getElementById('status').style.color = 'red';
  setTimeout(() => location.reload(), 5000);
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Only start tracking when map is fully loaded
map.on('load', () => {
  console.log('Map loaded');
  
  // Geolocation Tracking
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude, accuracy } = position.coords;
        console.log('My position:', { longitude, latitude });
        
        // Update user marker
        if (!userMarker) {
          userMarker = new mapboxgl.Marker({ color: '#4287f5' })
            .setLngLat([longitude, latitude])
            .addTo(map);
          map.flyTo({ center: [longitude, latitude], zoom: 15 });
        } else {
          userMarker.setLngLat([longitude, latitude]);
        }

        // Send to server
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'location_update',
            lng: longitude,
            lat: latitude,
            accuracy: accuracy
          }));
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert(`Location Error: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  } else {
    alert('Geolocation not supported by your browser');
  }
});

// Handle incoming locations
socket.onmessage = (event) => {
  try {
    console.log('Raw message:', event.data);
    const data = JSON.parse(event.data);
    
    if (data.type === 'user_locations') {
      console.log('Received users:', data.users);
      
      // Track which users we've seen in this update
      const currentUserIds = new Set();
      
      // Add/update markers
      data.users.forEach(user => {
        currentUserIds.add(user.id);
        
        if (!otherUsers[user.id]) {
          console.log('Creating marker for:', user.id);
          otherUsers[user.id] = new mapboxgl.Marker({ color: '#ff5a5f' })
            .setLngLat([user.lng, user.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`User ${user.id.slice(0, 5)}`))
            .addTo(map);
        } else {
          otherUsers[user.id].setLngLat([user.lng, user.lat]);
        }
      });
      
      // Remove markers for users who disconnected
      Object.keys(otherUsers).forEach(id => {
        if (!currentUserIds.has(id)) {
          console.log('Removing marker for:', id);
          otherUsers[id].remove();
          delete otherUsers[id];
        }
      });
    }
  } catch (error) {
    console.error('Error processing message:', error, event.data);
  }
};