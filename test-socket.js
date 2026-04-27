const fetch = require('node:fetch');
const { io } = require('socket.io-client');

(async () => {
  try {
    console.log('=== Socket Integration Test ===\n');
    console.log('1️⃣  Creating session...');
    
    const createRes = await fetch('http://localhost:3000/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: 'test-' + Date.now() })
    });
    
    const { session } = await createRes.json();
    const sessionId = session.sessionId;
    console.log(`   ✓ Session: ${sessionId.slice(0, 12)}...`);
    
    console.log('\n2️⃣  Connecting socket...');
    const socket = io('http://localhost:3000', {
      auth: { sessionId },
      transports: ['websocket'],
    });
    
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        console.error('   ✗ Timeout waiting for geospace_update');
        process.exit(1);
      }
    }, 4000);
    
    socket.on('connect', () => {
      console.log('   ✓ Connected');
      console.log('\n3️⃣  Sending location_update (Manipal)...');
      socket.emit('location_update', {
        lat: 12.9745,
        lng: 77.6080,
        accuracy: 75,
        speed: null,
      });
    });
    
    socket.on('geospace_update', (data) => {
      resolved = true;
      clearTimeout(timer);
      console.log('\n4️⃣  Received geospace_update ✅');
      console.log(`   • geospaceId: ${data.geospaceId}`);
      console.log(`   • threads: ${data.threads?.length || 0}`);
      console.log(`   • venue: ${data.venueId || 'none'}`);
      console.log('\n✅ SOCKET INTEGRATION PASSED\n');
      socket.disconnect();
      process.exit(0);
    });
    
    socket.on('error', (e) => {
      console.error('\n✗ Socket error:', e);
      process.exit(1);
    });
    
    socket.on('connect_error', (e) => {
      console.error('\n✗ Connection error:', e.message);
      process.exit(1);
    });
  } catch(e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  }
})();
