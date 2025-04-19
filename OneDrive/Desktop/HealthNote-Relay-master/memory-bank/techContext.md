# HealthNote-Relay Technical Context

## Technology Stack

### Main Relay
- **Language**: Go 1.20+
- **Framework**: [fiatjaf/relayer](https://github.com/fiatjaf/relayer)
- **Database**: PostgreSQL 14+
- **Dependencies**: 
  - `github.com/fiatjaf/relayer` - Core relay framework
  - `github.com/lib/pq` - PostgreSQL driver
  - `github.com/nbd-wtf/go-nostr` - Nostr protocol implementation

### Blossom Node
- **Language**: Node.js 18+
- **Framework**: Express.js
- **Storage**: LevelDB/SQLite
- **Dependencies**:
  - `express` - Web server framework
  - `level` or `better-sqlite3` - Database integration
  - `nostr-tools` - Nostr protocol utilities
  - `ws` - WebSocket implementation

### Client SDK
- **Language**: TypeScript 4.9+
- **Build Tool**: esbuild
- **Dependencies**:
  - `nostr-tools` - Nostr protocol utilities
  - `@noble/secp256k1` - Cryptographic functions

### Development Tools
- **Containerization**: Docker & Docker Compose
- **Testing**: Go testing, Jest (JavaScript), Vitest (TypeScript)
- **CI/CD**: GitHub Actions

## Development Setup

### Prerequisites
- Go 1.20+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (local or containerized)

### Local Development
1. Clone the repository
2. Run `docker-compose up` to start all services
3. The relay will be available at http://localhost:8080
4. The Blossom node will be available at http://localhost:3000

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `BLOSSOM_PUBKEY` - Public key for the Blossom node
- `CONTACT_EMAIL` - Contact email for the Blossom node administrator

## Technical Constraints

### Performance Targets
- Support for 1000+ concurrent connections
- Latency under 100ms for read operations
- Support for high write throughput for fitness tracking data

### Security Requirements
- End-to-end encryption for private health data
- NIP-04 compliance for encryption
- Proper input validation and sanitization
- Secure WebSocket connections

### Compatibility
- Support for standard Nostr clients with extensions
- Backward compatibility with basic Nostr protocol
- Cross-platform client SDK (web, mobile, desktop) 