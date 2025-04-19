import WebSocket from 'ws';
import crypto from 'crypto';
import * as nostrTools from 'nostr-tools';

// Parse command line arguments
const args = process.argv.slice(2);
const relayUrl = args[0] || 'wss://relay.damus.io';

// Connect to relay
console.log(`Connecting to relay: ${relayUrl}`);
const relay = new WebSocket(relayUrl);

relay.on('open', async () => {
  console.log('Connected to relay');
  
  try {
    const subscription = JSON.stringify([
      "REQ",
      "test-sub",
      {
        "kinds": [1],
        "limit": 5
      }
    ]);
    
    console.log('Sending subscription:', subscription);
    relay.send(subscription);
    
    // Set a timeout to close after 10 seconds
    setTimeout(() => {
      console.log('Test completed');
      relay.close();
    }, 10000);
    
  } catch (error) {
    console.error('Test error:', error.message);
    relay.close();
  }
});

relay.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message type:', message[0]);
    if (message[0] === 'EVENT') {
      console.log('  Event ID:', message[2].id);
      console.log('  Event kind:', message[2].kind);
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