// Debug script to examine available functions in nostr-tools
const nostrTools = require('nostr-tools');

console.log('nostr-tools available functions:');
console.log(Object.keys(nostrTools));

// Check for event-related functions
if (nostrTools.getEventHash) console.log('getEventHash is available');
if (nostrTools.signEvent) console.log('signEvent is available');
if (nostrTools.verifyEvent) console.log('verifyEvent is available');
if (nostrTools.finalizeEvent) console.log('finalizeEvent is available');
if (nostrTools.serializeEvent) console.log('serializeEvent is available');

// Check for key-related functions
if (nostrTools.getPublicKey) console.log('getPublicKey is available');
if (nostrTools.generatePrivateKey) console.log('generatePrivateKey is available');
if (nostrTools.generateSecretKey) console.log('generateSecretKey is available');

// Check for nip modules
if (nostrTools.nip04) {
  console.log('nip04 is available:');
  console.log(Object.keys(nostrTools.nip04));
}

if (nostrTools.nip19) {
  console.log('nip19 is available:');
  console.log(Object.keys(nostrTools.nip19));
}

// Detect nip05 and nip57
if (nostrTools.nip05) console.log('nip05 is available');
if (nostrTools.nip57) console.log('nip57 is available');

// Check if there are any utils
if (nostrTools.utils) {
  console.log('utils is available:');
  console.log(Object.keys(nostrTools.utils));
} 