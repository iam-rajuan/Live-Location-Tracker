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

// Connection Indicators
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

// User's Marker
let userMarker = null;
const otherUsers = {};

// Geolocation Tracking
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { longitude, latitude, accuracy } = position.coords;
      
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
      socket.send(JSON.stringify({
        type: 'location_update',
        lng: longitude,
        lat: latitude,
        accuracy: accuracy
      }));
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

// Handle incoming locations
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'user_locations') {
    data.users.forEach(user => {
      if (!otherUsers[user.id]) {
        // Create new marker
        otherUsers[user.id] = new mapboxgl.Marker({ color: '#ff5a5f' })
          .setLngLat([user.lng, user.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`User ${user.id.slice(0, 5)}`))
          .addTo(map);
      } else {
        // Update existing marker
        otherUsers[user.id].setLngLat([user.lng, user.lat]);
      }
    });
  }
};