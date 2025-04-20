mapboxgl.accessToken = 'pk.eyJ1IjoiaWFtLXJhanVhbiIsImEiOiJjbTlwc21sY2QwOGFqMmtzZmk0bmVmeTY4In0.uump7C1sJdV219uJEDYQuA'; // Replace with your token!

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [0, 0],
    zoom: 1
});

let userMarker = null;
const socket = new WebSocket('ws://localhost:8080'); // Connects to our Node.js server

// Start tracking user's location
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { longitude, latitude } = position.coords;
            
            // Update or create marker
            if (!userMarker) {
                userMarker = new mapboxgl.Marker({ color: 'blue' })
                    .setLngLat([longitude, latitude])
                    .addTo(map);
                map.flyTo({ center: [longitude, latitude], zoom: 15 });
            } else {
                userMarker.setLngLat([longitude, latitude]);
            }

            // Send location to WebSocket server
            socket.send(JSON.stringify({
                type: 'location_update',
                lng: longitude,
                lat: latitude
            }));
        },
        (error) => alert(`Error: ${error.message}`),
        { enableHighAccuracy: true }
    );
} else {
    alert("Geolocation not supported!");
}

// Receive other users' locations
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Other users:", data.users);
};