// CommonJS version of the publish test
const WebSocket = require('ws');
const crypto = require('crypto');
const nostrTools = require('nostr-tools');

// Parse command line arguments
const args = process.argv.slice(2);
const relayUrl = args[0] || 'wss://relay.damus.io';

// Generate or use a private key
let privateKey;
if (args[1]) {
  privateKey = args[1];
} else {
  privateKey = Buffer.from(crypto.randomBytes(32)).toString('hex');
  console.log(`Generated private key: ${privateKey}`);
}

const publicKey = nostrTools.getPublicKey(privateKey);
console.log(`Using public key: ${publicKey}`);

// Create a simple event (kind 1 = text note)
const event = {
  kind: 1,
  pubkey: publicKey,
  created_at: Math.floor(Date.now() / 1000),
  tags: [['t', 'healthnote-test']],
  content: 'Testing HealthNote-Relay integration'
};

// Calculate the event ID
event.id = nostrTools.getEventHash(event);

// Sign the event - just get the signature value
const sig = nostrTools.finalizeEvent(event, privateKey);
// For circular reference issues, extract just the string signature
event.sig = typeof sig === 'string' ? sig : sig.sig || sig.toString();

console.log('\nEvent created:');
console.log(`  ID: ${event.id}`);
console.log(`  Kind: ${event.kind}`);
console.log(`  Content: ${event.content}`);
console.log(`  Signature: ${event.sig.substring(0, 20)}...`);

// Create a clean version to avoid circular references
const cleanEvent = {
  id: event.id,
  pubkey: event.pubkey,
  created_at: event.created_at,
  kind: event.kind,
  tags: event.tags,
  content: event.content,
  sig: event.sig
};

// Connect to relay
console.log(`\nConnecting to relay: ${relayUrl}`);
const relay = new WebSocket(relayUrl);

relay.on('open', () => {
  console.log('Connected to relay');
  
  // Publish the event
  const message = JSON.stringify(['EVENT', cleanEvent]);
  console.log('Sending event to relay...');
  relay.send(message);
});

relay.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message:', message);
    
    if (message[0] === 'OK' && message[1] === event.id) {
      if (message[2] === true) {
        console.log('\n✅ Event published successfully!');
      } else {
        console.log('\n❌ Event rejected by relay');
        if (message[3]) {
          console.log(`Reason: ${message[3]}`);
        }
      }
      setTimeout(() => relay.close(), 1000);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

relay.on('error', (error) => {
  console.error('Relay connection error:', error);
});

relay.on('close', () => {
  console.log('Disconnected from relay');
}); 