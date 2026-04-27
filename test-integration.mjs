import { io } from 'socket.io-client';

console.log('Testing socket connection and geospace flow...\n');

const socket = io('http://localhost:3000', {
  auth: { sessionId: 'test-session-' + Date.now() },
  transports: ['websocket'],
  reconnection: true,
});

let timeout = setTimeout(() => {
  console.error('✗ TIMEOUT: No geospace_update after 6s');
  socket.disconnect();
  process.exit(1);
}, 6000);

socket.on('connect', () => {
  console.log('✓ Socket connected to gateway');
  console.log('→ Emitting location_update (Manipal coordinates)...');
  socket.emit('location_update', {
    lat: 12.9745,
    lng: 77.6080,
    accuracy: 75,
    speed: null,
  });
});

socket.on('geospace_update', (data) => {
  clearTimeout(timeout);
  console.log('\n✓ SUCCESS: Received geospace_update');
  console.log('  - geospaceId:', data.geospaceId);
  console.log('  - threads:', data.threads?.length || 0, 'threads');
  console.log('  - venueId:', data.venueId || 'none');
  console.log('\n✅ Integration test PASSED');
  socket.disconnect();
  process.exit(0);
});

socket.on('error', (err) => {
  clearTimeout(timeout);
  console.error('\n✗ Socket error:', err);
  process.exit(1);
});

socket.on('connect_error', (err) => {
  clearTimeout(timeout);
  console.error('\n✗ Connection error:', err.message);
  process.exit(1);
});
