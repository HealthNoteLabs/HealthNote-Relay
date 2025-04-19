package storage

import (
	"context"

	"github.com/nbd-wtf/go-nostr"
)

// Storage defines the interface for relay storage
type Storage interface {
	// Event storage
	SaveEvent(event *nostr.Event) error
	QueryEvents(ctx context.Context, filters []*nostr.Filter) ([]nostr.Event, error)
	DeleteExpiredEvents() error

	// Blossom node management
	SaveBlossomNode(node *BlossomNode) error
	GetBlossomNodes() ([]BlossomNode, error)

	// Cleanup
	Close() error
} 