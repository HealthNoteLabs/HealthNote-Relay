# Testing the HealthNote-Relay

This guide will walk you through how to test your HealthNote-Relay implementation using the provided test script.

## Prerequisites

- Node.js (v14 or later)
- A running HealthNote-Relay instance
- Optional: A Nostr private key for testing

## Setup

The test script requires a few dependencies. You can install them automatically using the setup script:

```bash
node scripts/setup-test-deps.js
```

This will install the required packages (`ws` and `nostr-tools`) and make the test script executable.

## Running the Tests

The test script will:

1. Create and publish an Exercise Template (kind: 33401)
2. Create and publish a Workout Template (kind: 33402) referencing the Exercise Template
3. Create and publish a Workout Record (kind: 1301) referencing both templates
4. Query for events to verify they were stored correctly
5. Test different privacy levels to ensure they're handled appropriately

### Basic Usage

```bash
node scripts/test-relay.js <relay-url>
```

For example:

```bash
node scripts/test-relay.js wss://relay.healthnote.io
```

This will generate a temporary private key for testing.

### Using Your Own Private Key

If you want to use your own private key for testing:

```bash
node scripts/test-relay.js <relay-url> <private-key>
```

For example:

```bash
node scripts/test-relay.js wss://relay.healthnote.io 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## Test Output

The script will output the progress and results of each test step:

```
Connecting to relay: wss://relay.healthnote.io
Connected to relay

--- Starting HealthNote-Relay Tests ---

📋 Test 1: Create Exercise Template
✅ Exercise Template published with ID: a1b2c3d4...

📋 Test 2: Create Workout Template
✅ Workout Template published with ID: e5f6g7h8...

📋 Test 3: Create Workout Record
✅ Workout Record published with ID: i9j0k1l2...

📋 Test 4: Querying Events
Testing query for exercise templates (kind: 33401)...
✅ Found 1 exercise template(s)
Testing query for workout templates (kind: 33402)...
✅ Found 1 workout template(s)
Testing query for workout records (kind: 1301)...
✅ Found 1 workout record(s)
Testing query with tag filters...
✅ Found 1 strength workout(s) with tag filter

📋 Test 5: Testing Privacy Levels
✅ Public workout published with ID: m3n4o5p6...
✅ Limited workout published with ID: q7r8s9t0...
✅ Private workout published with ID: u1v2w3x4...
Verifying events with different privacy levels...
✅ Public event verified
✅ Limited event verified
ℹ️ Private event not found on main relay (expected if using Blossom node)

✅ All tests completed successfully!
Disconnected from relay
```

## Troubleshooting

### Connection Issues

If the script cannot connect to the relay:

1. Verify the relay URL is correct
2. Ensure the relay is running and accessible
3. Check if the relay requires authentication
4. Verify your network connection

### Event Storage Issues

If events are not being stored:

1. Check the relay logs for errors
2. Verify the event kinds (33401, 33402, 1301) are supported
3. Ensure the relay accepts events with the test's pubkey
4. Check if the relay has any restrictions on event content or size

### Privacy Classification Issues

If privacy levels aren't working as expected:

1. Verify the relay's privacy classifier is properly implemented
2. Check that the `privacy` tag is being recognized
3. For private events, ensure a Blossom node is configured if required

## Running Against a Local Relay

To test against a locally running relay:

```bash
node scripts/test-relay.js ws://localhost:8080
```

This is especially useful during development to ensure your implementation is handling NIP-101e events correctly before deploying to production.

## Next Steps

After successfully running the tests, you might want to:

1. Implement client applications that use the relay
2. Configure Blossom nodes for private data storage
3. Setup authentication for restricted access
4. Develop specialized query endpoints for workout data

For more information on implementing clients, see the [Client SDK Usage](./nip-101e-implementation.md#client-sdk-usage) documentation. 