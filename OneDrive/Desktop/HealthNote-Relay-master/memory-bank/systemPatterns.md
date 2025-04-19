# HealthNote-Relay System Patterns

## System Architecture
HealthNote-Relay implements a hybrid architecture combining traditional Nostr relay capabilities with Blossom nodes for private data storage:

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Client App  │────▶│  Main Go Relay   │────▶│  PostgreSQL   │
└─────────────┘     └──────────────────┘     └───────────────┘
        │                     │
        │                     │
        │                     ▼
        │           ┌──────────────────┐
        └──────────▶│  Blossom Nodes   │
                    └──────────────────┘
```

## Key Components

### Main Relay (Go)
- **BlossomAwareRelay struct**: Extends DefaultRelay with Blossom integration
- **Data Router**: Routes requests based on privacy classification
- **Privacy Classifier**: Categorizes health events by privacy level
- **Blossom Registry**: Maintains list of available Blossom nodes

### Blossom Node (Node.js)
- **Storage Adapter**: Pluggable storage for different backends
- **E2E Encryption**: Handles encryption/decryption of private data
- **Access Control**: Manages permissions and data sharing
- **Health Data Models**: Specialized data structures for health metrics

### Client SDK (TypeScript)
- **Connection Manager**: Handles connections to relay and Blossom nodes
- **Data Publisher**: Publishes health events with appropriate privacy settings
- **Query Builder**: Builds and executes queries across the network
- **Privacy Settings Manager**: Controls user privacy preferences

## Design Patterns

1. **Hybrid Storage Pattern**
   - Public data: Stored in PostgreSQL on the main relay
   - Private data: Stored in Blossom nodes (LevelDB/SQLite)
   - Metadata-only references on the main relay for private data

2. **Smart Routing Pattern**
   - Event-based routing decisions based on event kinds and tags
   - Dynamic discovery of appropriate storage locations
   - Fallback mechanisms when preferred storage is unavailable

3. **Privacy Classification Pattern**
   - Events classified by privacy level: public, limited, private
   - Classification based on event kind, content, and tags
   - User-configurable privacy defaults per metric type

4. **End-to-End Encryption Pattern**
   - NIP-04 based encryption for private health data
   - Metadata-preserving encryption for queryable private data
   - Key rotation and management for long-term security 