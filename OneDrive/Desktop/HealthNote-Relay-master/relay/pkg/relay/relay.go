package relay

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/fiatjaf/relayer"
	"github.com/nbd-wtf/go-nostr"
)

// PrivacyLevel represents the privacy level of a health event
type PrivacyLevel int

const (
	// Public events are stored on the main relay and visible to everyone
	Public PrivacyLevel = iota
	// Limited events are stored on the main relay but with access control
	Limited
	// Private events are stored on Blossom nodes with encryption
	Private
)

// Health and Fitness event kinds
const (
	// NIP-101e Workout Events
	WorkoutRecordKind    = 1301  // Workout records
	ExerciseTemplateKind = 33401 // Exercise templates
	WorkoutTemplateKind  = 33402 // Workout templates

	// Health event kinds range
	HealthEventMinKind = 32018
	HealthEventMaxKind = 32048
)

// BlossomNode represents a registered Blossom node
type BlossomNode struct {
	URL             string   `json:"url"`
	Pubkey          string   `json:"pubkey"`
	SupportedMetrics []int    `json:"supported_metrics"`
	LastSeen        time.Time `json:"last_seen"`
}

// BlossomAwareRelay extends DefaultRelay with Blossom integration
type BlossomAwareRelay struct {
	relayer.DefaultRelay
	blossomNodes     map[string]BlossomNode
	blossomNodeMutex sync.RWMutex
}

// NewBlossomAwareRelay creates a new BlossomAwareRelay
func NewBlossomAwareRelay() *BlossomAwareRelay {
	return &BlossomAwareRelay{
		blossomNodes: make(map[string]BlossomNode),
	}
}

// RegisterBlossomNode registers a Blossom node with the relay
func (r *BlossomAwareRelay) RegisterBlossomNode(node BlossomNode) {
	r.blossomNodeMutex.Lock()
	defer r.blossomNodeMutex.Unlock()
	
	node.LastSeen = time.Now()
	r.blossomNodes[node.Pubkey] = node
	log.Printf("Registered Blossom node: %s", node.URL)
}

// GetBlossomNodes returns all registered Blossom nodes
func (r *BlossomAwareRelay) GetBlossomNodes() []BlossomNode {
	r.blossomNodeMutex.RLock()
	defer r.blossomNodeMutex.RUnlock()
	
	nodes := make([]BlossomNode, 0, len(r.blossomNodes))
	for _, node := range r.blossomNodes {
		nodes = append(nodes, node)
	}
	return nodes
}

// ClassifyEvent classifies a health event based on its privacy level
func (r *BlossomAwareRelay) ClassifyEvent(event *nostr.Event) PrivacyLevel {
	// Check for workout related events (NIP-101e)
	if event.Kind == WorkoutRecordKind || event.Kind == ExerciseTemplateKind || event.Kind == WorkoutTemplateKind {
		// Check for privacy tags
		for _, tag := range event.Tags {
			if len(tag) >= 2 && tag[0] == "privacy" || tag[0] == "privacy_level" {
				switch tag[1] {
				case "private":
					return Private
				case "limited", "friends":
					return Limited
				case "public":
					return Public
				}
			}
		}

		// Default for workout events: workout templates and exercise templates are public by default
		// Workout records are limited by default
		switch event.Kind {
		case WorkoutRecordKind:
			return Limited
		case ExerciseTemplateKind, WorkoutTemplateKind:
			return Public
		}
	}

	// Check if the event is a health event (kind 32018-32048)
	if event.Kind >= HealthEventMinKind && event.Kind <= HealthEventMaxKind {
		// Check for privacy tags
		for _, tag := range event.Tags {
			if len(tag) >= 2 && tag[0] == "privacy" || tag[0] == "privacy_level" {
				switch tag[1] {
				case "private":
					return Private
				case "limited", "friends":
					return Limited
				case "public":
					return Public
				}
			}
		}
		
		// Default privacy level based on kind
		switch {
		// Public health events (achievements, challenges)
		case event.Kind >= 32040 && event.Kind <= 32048:
			return Public
		// Limited health events (shared metrics)
		case event.Kind >= 32030 && event.Kind <= 32039:
			return Limited
		// Private health events (personal metrics)
		default:
			return Private
		}
	}
	
	// Non-health events are public by default
	return Public
}

// FindBlossomNodeForEvent finds the appropriate Blossom node for a private event
func (r *BlossomAwareRelay) FindBlossomNodeForEvent(event *nostr.Event) *BlossomNode {
	r.blossomNodeMutex.RLock()
	defer r.blossomNodeMutex.RUnlock()
	
	// First check for explicit blossom tag
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "blossom" {
			if node, exists := r.blossomNodes[tag[1]]; exists {
				return &node
			}
		}
	}
	
	// Find a node that supports this metric kind
	for _, node := range r.blossomNodes {
		for _, kind := range node.SupportedMetrics {
			if event.Kind == kind {
				return &node
			}
		}
	}
	
	return nil
}

// AcceptEvent handles a new event, potentially routing to a Blossom node
func (r *BlossomAwareRelay) AcceptEvent(ctx context.Context, event *nostr.Event) bool {
	privacyLevel := r.ClassifyEvent(event)
	
	switch privacyLevel {
	case Public, Limited:
		// Store on main relay
		return r.DefaultRelay.AcceptEvent(ctx, event)
	case Private:
		// Find appropriate Blossom node
		node := r.FindBlossomNodeForEvent(event)
		if node != nil {
			// Store reference on main relay
			refEvent := r.createReferenceEvent(event, node)
			r.DefaultRelay.AcceptEvent(ctx, refEvent)
			
			// TODO: Forward to Blossom node
			// This would involve an HTTP request to the Blossom node
			log.Printf("Event %s should be forwarded to Blossom node %s", event.ID, node.URL)
			return true
		}
		
		// If no Blossom node is available, still accept the event on the main relay
		log.Printf("No Blossom node available for private event %s", event.ID)
		return r.DefaultRelay.AcceptEvent(ctx, event)
	}
	
	return false
}

// createReferenceEvent creates a reference event that points to a private event on a Blossom node
func (r *BlossomAwareRelay) createReferenceEvent(event *nostr.Event, node *BlossomNode) *nostr.Event {
	refEvent := &nostr.Event{
		Kind:      30078, // Health data reference
		CreatedAt: time.Now(),
		Tags: []nostr.Tag{
			{"e", event.ID},            // Original event ID
			{"p", event.PubKey},        // Original event author
			{"kind", string(event.Kind)}, // Original event kind
			{"blossom", node.Pubkey},   // Blossom node pubkey
			{"url", node.URL},          // Blossom node URL
		},
		Content: "", // Empty content for the reference
	}
	
	// Add additional metadata tags from the original event
	for _, tag := range event.Tags {
		if len(tag) >= 2 && (tag[0] == "d" || tag[0] == "t" || tag[0] == "subject") {
			refEvent.Tags = append(refEvent.Tags, tag)
		}
	}
	
	return refEvent
} 