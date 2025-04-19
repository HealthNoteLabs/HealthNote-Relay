// Import WebSocket for connection
import WebSocket from 'ws';

// Import required nostr functions
import pkg from 'nostr-tools';
const { getPublicKey, getEventHash, signEvent } = pkg;

// Import crypto for random bytes
import crypto from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const relayUrl = args[0] || 'wss://relay.damus.io';

// Generate a private key (32 bytes)
const privateKey = Buffer.from(crypto.randomBytes(32)).toString('hex');
const publicKey = getPublicKey(privateKey);

console.log('Generated keypair:');
console.log(`  Private key: ${privateKey}`);
console.log(`  Public key: ${publicKey}`);

// Create a simple note event
const event = {
  kind: 1,
  pubkey: publicKey,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'Hello from HealthNote-Relay test!'
};

// Sign the event
event.id = getEventHash(event);
event.sig = signEvent(event, privateKey);

console.log('\nEvent created:');
console.log(`  ID: ${event.id}`);
console.log(`  Created: ${new Date(event.created_at * 1000).toISOString()}`);
console.log(`  Content: ${event.content}`);

// Connect to the relay
console.log(`\nConnecting to ${relayUrl}...`);
const socket = new WebSocket(relayUrl);

socket.on('open', () => {
  console.log('Connected to relay');
  
  // Publish the event
  const message = JSON.stringify(['EVENT', event]);
  console.log(`Sending: ${message}`);
  socket.send(message);
});

socket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
  
  // Check if it's an OK message for our event
  if (message[0] === 'OK' && message[1] === event.id) {
    console.log('\nEvent status:', message[2] ? 'Accepted ✅' : 'Rejected ❌');
    if (message[2] === false && message[3]) {
      console.log(`Reason: ${message[3]}`);
    }
    socket.close();
  }
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

socket.on('close', () => {
  console.log('Disconnected from relay');
}); 