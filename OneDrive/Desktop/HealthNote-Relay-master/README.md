# HealthNote-Relay

A specialized Nostr relay for health and fitness data with enhanced privacy controls and Blossom node integration.

## Project Overview

HealthNote-Relay is a privacy-first relay implementation for the Nostr protocol, specifically designed to handle health and fitness data according to the NIP-101e specification. It features a hybrid architecture combining a traditional relay with Blossom nodes for enhanced client-side data management.

### Key Features

- **Privacy-Focused Design**: Three-tiered privacy model for health data (public, limited, private)
- **Hybrid Storage Architecture**: Traditional relay + Blossom nodes
- **Smart Data Routing**: Automatic routing based on privacy classification
- **End-to-End Encryption**: For sensitive health metrics
- **Social Features**: Fitness challenges, comparative metrics, and more
- **Customizable Data Retention**: User-controlled retention policies

## Architecture

The project consists of three main components:

1. **Main Relay**: A Go-based implementation that extends the standard Nostr relay with health data awareness
2. **Blossom Node**: A Node.js server that handles private data storage and provides local relay capabilities
3. **Client SDK**: Libraries to simplify integration with applications

## NIP-101e Specification

NIP-101e defines the standard for health and fitness data on Nostr, including:

- **Exercise Templates** (kind: 33401): Reusable exercise definitions
- **Workout Templates** (kind: 33402): Workout plans composed of exercises
- **Workout Records** (kind: 1301): Completed workout data

For detailed information on the data schema, refer to the [NIP-101e Schema Reference](docs/nip-101e-schema-reference.md).

## Getting Started

### Prerequisites

- Go 1.20+ (for the main relay)
- Node.js 18+ (for the Blossom node)
- PostgreSQL 14+ (for the main relay storage)

### Installation

#### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/HealthNoteLabs/HealthNote-Relay.git
cd HealthNote-Relay

# Start all components
docker-compose up -d
```

#### Manual Setup

1. **Set up the main relay**:
```bash
cd relay
go mod download
go build -o relay ./cmd/relay
./relay
```

2. **Set up the Blossom node**:
```bash
cd blossom
npm install
npm start
```

## Testing

The project includes test scripts to verify the implementation of NIP-101e:

```bash
# Install dependencies
npm install ws nostr-tools

# Test basic connectivity
node scripts/test-publish.cjs ws://your-relay-url

# Test NIP-101e functionality
node scripts/test-health-relay.cjs ws://your-relay-url
```

For detailed testing instructions, see [README-testing.md](README-testing.md).

## Configuration

### Main Relay

The main relay can be configured through environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `RELAY_PUBKEY`: Public key of the relay (for NIP-11)
- `CONTACT_EMAIL`: Contact email for the relay (for NIP-11)

### Blossom Node

Blossom nodes can be configured through environment variables:

- `BLOSSOM_PUBKEY`: Public key of the Blossom node
- `CONTACT_EMAIL`: Contact email for the Blossom node
- `STORAGE_TYPE`: Storage backend type (default: level)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Nostr protocol community
- Contributors to the NIP-101e specification
- All health and fitness enthusiasts using Nostr 