package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"github.com/nbd-wtf/go-nostr"
)

// PostgresStorage implements Storage interface with PostgreSQL backend
type PostgresStorage struct {
	db *sql.DB
}

// NewPostgresStorage creates a new PostgreSQL storage
func NewPostgresStorage(connectionString string) (*PostgresStorage, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	// Set connection parameters
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	storage := &PostgresStorage{db: db}
	if err := storage.createSchema(); err != nil {
		return nil, fmt.Errorf("error creating schema: %w", err)
	}

	return storage, nil
}

// createSchema creates the database schema if it doesn't exist
func (s *PostgresStorage) createSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		pubkey TEXT NOT NULL,
		created_at BIGINT NOT NULL,
		kind INT NOT NULL,
		tags JSONB NOT NULL,
		content TEXT NOT NULL,
		sig TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS blossom_nodes (
		pubkey TEXT PRIMARY KEY,
		url TEXT NOT NULL,
		supported_metrics JSONB NOT NULL,
		last_seen TIMESTAMP WITH TIME ZONE NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_events_pubkey ON events(pubkey);
	CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
	CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
	CREATE INDEX IF NOT EXISTS idx_events_pubkey_kind ON events(pubkey, kind);
	CREATE INDEX IF NOT EXISTS idx_events_health_kinds ON events(kind) WHERE (kind >= 32018 AND kind <= 32048);
	
	-- NIP-101e workout events indices
	CREATE INDEX IF NOT EXISTS idx_events_workout_records ON events(kind) WHERE (kind = 1301);
	CREATE INDEX IF NOT EXISTS idx_events_exercise_templates ON events(kind) WHERE (kind = 33401);
	CREATE INDEX IF NOT EXISTS idx_events_workout_templates ON events(kind) WHERE (kind = 33402);
	
	-- Index for tag searching (useful for querying exercise/workout references)
	CREATE INDEX IF NOT EXISTS idx_events_tags_exercise ON events USING GIN (tags) WHERE (kind = 1301 OR kind = 33401 OR kind = 33402);
	`

	_, err := s.db.Exec(schema)
	return err
}

// SaveEvent saves an event to the database
func (s *PostgresStorage) SaveEvent(event *nostr.Event) error {
	query := `
	INSERT INTO events (id, pubkey, created_at, kind, tags, content, sig)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	ON CONFLICT (id) DO NOTHING
	RETURNING id`

	tagsJSON, err := json.Marshal(event.Tags)
	if err != nil {
		return fmt.Errorf("error marshaling tags: %w", err)
	}

	var id string
	err = s.db.QueryRow(
		query,
		event.ID,
		event.PubKey,
		event.CreatedAt.Unix(),
		event.Kind,
		tagsJSON,
		event.Content,
		event.Sig,
	).Scan(&id)

	// If there's no error or the error is just that the row already exists
	if err == nil || err == sql.ErrNoRows {
		return nil
	}

	return fmt.Errorf("error saving event: %w", err)
}

// QueryEvents queries events based on filters
func (s *PostgresStorage) QueryEvents(ctx context.Context, filters []*nostr.Filter) ([]nostr.Event, error) {
	var events []nostr.Event

	for _, filter := range filters {
		baseQuery := `
		SELECT id, pubkey, created_at, kind, tags, content, sig
		FROM events
		WHERE 1=1`

		var conditions []interface{}
		var args []interface{}
		argCounter := 1

		// Add IDs condition
		if len(filter.IDs) > 0 {
			placeholders := make([]string, len(filter.IDs))
			for i, id := range filter.IDs {
				placeholders[i] = fmt.Sprintf("$%d", argCounter)
				args = append(args, id)
				argCounter++
			}
			conditions = append(conditions, fmt.Sprintf("id IN (%s)", joinStrings(placeholders, ", ")))
		}

		// Add Authors condition
		if len(filter.Authors) > 0 {
			placeholders := make([]string, len(filter.Authors))
			for i, author := range filter.Authors {
				placeholders[i] = fmt.Sprintf("$%d", argCounter)
				args = append(args, author)
				argCounter++
			}
			conditions = append(conditions, fmt.Sprintf("pubkey IN (%s)", joinStrings(placeholders, ", ")))
		}

		// Add Kinds condition
		if len(filter.Kinds) > 0 {
			placeholders := make([]string, len(filter.Kinds))
			for i, kind := range filter.Kinds {
				placeholders[i] = fmt.Sprintf("$%d", argCounter)
				args = append(args, kind)
				argCounter++
			}
			conditions = append(conditions, fmt.Sprintf("kind IN (%s)", joinStrings(placeholders, ", ")))
		}

		// Add Since condition
		if filter.Since != nil {
			conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argCounter))
			args = append(args, filter.Since.Unix())
			argCounter++
		}

		// Add Until condition
		if filter.Until != nil {
			conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argCounter))
			args = append(args, filter.Until.Unix())
			argCounter++
		}

		// Add Limit condition
		limit := 100 // Default limit
		if filter.Limit > 0 {
			limit = filter.Limit
		}

		// Build the complete query
		query := baseQuery
		for _, condition := range conditions {
			query += " AND " + condition.(string)
		}
		query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", argCounter)
		args = append(args, limit)

		// Execute the query
		rows, err := s.db.QueryContext(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("error querying events: %w", err)
		}
		defer rows.Close()

		// Process the results
		for rows.Next() {
			var event nostr.Event
			var createdAt int64
			var tagsJSON []byte

			err := rows.Scan(
				&event.ID,
				&event.PubKey,
				&createdAt,
				&event.Kind,
				&tagsJSON,
				&event.Content,
				&event.Sig,
			)
			if err != nil {
				return nil, fmt.Errorf("error scanning event: %w", err)
			}

			event.CreatedAt = time.Unix(createdAt, 0)
			err = json.Unmarshal(tagsJSON, &event.Tags)
			if err != nil {
				return nil, fmt.Errorf("error unmarshaling tags: %w", err)
			}

			events = append(events, event)
		}

		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating rows: %w", err)
		}
	}

	return events, nil
}

// SaveBlossomNode saves a Blossom node to the database
func (s *PostgresStorage) SaveBlossomNode(node *BlossomNode) error {
	query := `
	INSERT INTO blossom_nodes (pubkey, url, supported_metrics, last_seen)
	VALUES ($1, $2, $3, $4)
	ON CONFLICT (pubkey) DO UPDATE SET
		url = EXCLUDED.url,
		supported_metrics = EXCLUDED.supported_metrics,
		last_seen = EXCLUDED.last_seen
	`

	metricsJSON, err := json.Marshal(node.SupportedMetrics)
	if err != nil {
		return fmt.Errorf("error marshaling supported metrics: %w", err)
	}

	_, err = s.db.Exec(
		query,
		node.Pubkey,
		node.URL,
		metricsJSON,
		node.LastSeen,
	)

	if err != nil {
		return fmt.Errorf("error saving Blossom node: %w", err)
	}

	return nil
}

// GetBlossomNodes retrieves all Blossom nodes from the database
func (s *PostgresStorage) GetBlossomNodes() ([]BlossomNode, error) {
	query := `
	SELECT pubkey, url, supported_metrics, last_seen
	FROM blossom_nodes
	WHERE last_seen > $1
	ORDER BY last_seen DESC
	`

	// Filter out nodes we haven't seen in the last day
	cutoff := time.Now().Add(-24 * time.Hour)
	rows, err := s.db.Query(query, cutoff)
	if err != nil {
		return nil, fmt.Errorf("error querying Blossom nodes: %w", err)
	}
	defer rows.Close()

	var nodes []BlossomNode
	for rows.Next() {
		var node BlossomNode
		var metricsJSON []byte

		err := rows.Scan(
			&node.Pubkey,
			&node.URL,
			&metricsJSON,
			&node.LastSeen,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning Blossom node: %w", err)
		}

		err = json.Unmarshal(metricsJSON, &node.SupportedMetrics)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling supported metrics: %w", err)
		}

		nodes = append(nodes, node)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return nodes, nil
}

// DeleteExpiredEvents deletes events that have expired
func (s *PostgresStorage) DeleteExpiredEvents() error {
	query := `
	DELETE FROM events
	WHERE EXISTS (
		SELECT 1 FROM jsonb_array_elements(tags) AS tag
		WHERE tag->0 = '"expires_at"'
		AND (tag->1)::text::int < $1
	)
	`

	result, err := s.db.Exec(query, time.Now().Unix())
	if err != nil {
		return fmt.Errorf("error deleting expired events: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Warning: could not get rows affected: %v", err)
	} else {
		log.Printf("Deleted %d expired events", rowsAffected)
	}

	return nil
}

// Close closes the database connection
func (s *PostgresStorage) Close() error {
	return s.db.Close()
}

// BlossomNode represents a Blossom node for private health data storage
type BlossomNode struct {
	Pubkey          string
	URL             string
	SupportedMetrics []int
	LastSeen        time.Time
}

// Helper function to join strings with a separator
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}

	result := strs[0]
	for _, s := range strs[1:] {
		result += sep + s
	}
	return result
} 