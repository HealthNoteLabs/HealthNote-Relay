# Testing HealthNote-Relay Implementation

This guide explains how to test your HealthNote-Relay implementation using the provided test scripts.

## Prerequisites

- Node.js (v14 or later)
- A running HealthNote-Relay instance (either your own or a public relay supporting the NIP-101e kinds)

## Setup

First, install the required dependencies:

```bash
npm install ws nostr-tools
```

This will install the WebSocket library and the Nostr tools needed for the tests.

## Running the Tests

### Testing Basic Connectivity

To test basic connectivity with your relay:

```bash
node scripts/test-publish.cjs ws://your-relay-url:port
```

This will:
1. Create a basic text note event (kind 1)
2. Publish it to your relay
3. Verify that the relay accepts it

### Testing NIP-101e Functionality

To test full NIP-101e functionality:

```bash
node scripts/test-health-relay.cjs ws://your-relay-url:port
```

This comprehensive test will:

1. Create and publish an Exercise Template (kind 33401)
2. Create and publish a Workout Template (kind 33402) referencing the Exercise Template
3. Create and publish a Workout Record (kind 1301) referencing both templates
4. Verify that all three events can be retrieved from the relay

### Using Your Own Private Key

You can optionally specify a private key to use for the tests:

```bash
node scripts/test-health-relay.cjs ws://your-relay-url:port your-private-key-hex
```

This is useful for testing with an existing account or for reproducible tests.

## Test Output

The tests provide detailed output of each step, showing:

- Generated key information
- Event IDs for each event type
- Confirmation of acceptance by the relay
- Verification of event retrieval
- Summary of test results

A successful test will show checkmarks (✅) for each step, indicating that your relay is correctly handling NIP-101e events.

## Troubleshooting

### Relay Rejections

If events are rejected by the relay, check for:

1. Relay configuration issues
2. Event validation problems
3. Whether required NIP-101e kinds are supported

### Connection Issues

If you cannot connect to the relay:

1. Verify the relay URL is correct (including protocol, host, and port)
2. Check that the relay is running
3. Verify network connectivity and firewall settings

### Query Issues

If events are accepted but cannot be queried:

1. Check relay storage configuration
2. Verify relay query implementation for custom kinds
3. Look for relay logs showing storage errors

## Further Testing

After basic functionality is confirmed, you may want to test:

1. **Privacy Classifications**: Test that privacy tags are being properly handled
2. **Blossom Node Integration**: Test integration with Blossom nodes for private data
3. **Event References**: Test that event references between templates and records work correctly
4. **Query Performance**: Test query performance with large numbers of events

## Using With Continuous Integration

These test scripts can be integrated into CI/CD pipelines to ensure your relay implementation continues to support NIP-101e functionality as the codebase evolves. 