import WebSocket from 'ws';
import { getPublicKey, getEventHash, signEvent } from 'nostr-tools';
import crypto from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const relayUrl = args[0] || 'wss://relay.damus.io';

// Generate a key pair
const privateKey = Buffer.from(crypto.randomBytes(32)).toString('hex');
const publicKey = getPublicKey(privateKey);

console.log(`Generated private key: ${privateKey}`);
console.log(`Generated public key: ${publicKey}`);

// Connect to relay
console.log(`\nConnecting to relay: ${relayUrl}`);
const relay = new WebSocket(relayUrl);

relay.on('open', async () => {
  console.log('Connected to relay');
  
  try {
    // Create a test event (kind 1 = text note)
    const event = {
      kind: 1,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['t', 'healthnote-test']],
      content: 'Testing HealthNote-Relay integration'
    };
    
    // Calculate the event ID
    event.id = getEventHash(event);
    
    // Sign the event
    event.sig = signEvent(event, privateKey);
    
    console.log('\nPublishing event:');
    console.log(`  ID: ${event.id}`);
    console.log(`  Kind: ${event.kind}`);
    console.log(`  Content: ${event.content}`);
    console.log(`  Signature: ${event.sig.substring(0, 20)}...`);
    
    // Publish event
    const message = JSON.stringify(['EVENT', event]);
    relay.send(message);
    
    console.log('\nWaiting for confirmation...');
    
  } catch (error) {
    console.error('\nError:', error);
    relay.close();
  }
});

relay.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message:', message);
    
    if (message[0] === 'OK' && message[2] === true) {
      console.log('\n✅ Event published successfully!');
      setTimeout(() => relay.close(), 1000);
    } else if (message[0] === 'OK' && message[2] === false) {
      console.log('\n❌ Event rejected by relay');
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