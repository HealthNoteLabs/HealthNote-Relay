// Debug script to see what's available in nostr-tools
import * as nostrTools from 'nostr-tools';

console.log('Functions in nostr-tools:');
console.log(Object.keys(nostrTools));

if (nostrTools.nip19) {
  console.log('\nFunctions in nostr-tools.nip19:');
  console.log(Object.keys(nostrTools.nip19));
}

if (nostrTools.SimplePool) {
  console.log('\nSimplePool exists');
}

if (nostrTools.generatePrivateKey) {
  console.log('\ngeneratePrivateKey exists');
} else if (nostrTools.utils && nostrTools.utils.generatePrivateKey) {
  console.log('\ngeneratePrivateKey exists under utils');
}

if (nostrTools.getPublicKey) {
  console.log('getPublicKey exists');
} else if (nostrTools.utils && nostrTools.utils.getPublicKey) {
  console.log('getPublicKey exists under utils');
}

if (nostrTools.getEventHash) {
  console.log('getEventHash exists');
} else if (nostrTools.utils && nostrTools.utils.getEventHash) {
  console.log('getEventHash exists under utils');
}

if (nostrTools.signEvent) {
  console.log('signEvent exists');
} else if (nostrTools.utils && nostrTools.utils.signEvent) {
  console.log('signEvent exists under utils');
} 