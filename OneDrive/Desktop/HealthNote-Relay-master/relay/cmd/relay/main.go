package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fiatjaf/relayer"
	"healthnote-relay/pkg/relay"
	"healthnote-relay/pkg/storage"
)

func main() {
	log.Println("Health & Fitness Relay for Nostr starting...")

	// Get database connection string from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/nostrhealthrelay?sslmode=disable"
	}

	// Create PostgreSQL storage
	store, err := storage.NewPostgresStorage(dbURL)
	if err != nil {
		log.Fatalf("Failed to create storage: %v", err)
	}
	defer store.Close()

	// Create BlossomAwareRelay
	r := relay.NewBlossomAwareRelay()

	// Create Nostr relay
	nostrRelay := relayer.NewRelay()
	nostrRelay.Storage = r
	nostrRelay.Info.Name = "Health & Fitness Relay"
	nostrRelay.Info.Description = "A specialized Nostr relay for health and fitness data with Blossom integration"
	nostrRelay.Info.PubKey = os.Getenv("RELAY_PUBKEY")
	nostrRelay.Info.Contact = os.Getenv("CONTACT_EMAIL")
	nostrRelay.Info.Software = "github.com/healthnote-relay"
	nostrRelay.Info.Version = "0.1.0"
	nostrRelay.Info.SupportedNIPs = []int{1, 2, 4, 9, 11, 12, 15, 16, 20, 33, 42}

	// Set up background tasks
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Run background task to delete expired events
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := store.DeleteExpiredEvents(); err != nil {
					log.Printf("Error deleting expired events: %v", err)
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// Set up HTTP server
	http.HandleFunc("/", nostrRelay.ServeHTTP)
	
	// Add an endpoint for Blossom node registration
	http.HandleFunc("/register-blossom", func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var node relay.BlossomNode
		if err := json.NewDecoder(req.Body).Decode(&node); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		r.RegisterBlossomNode(node)
		w.WriteHeader(http.StatusOK)
	})

	// Start HTTP server
	server := &http.Server{
		Addr:    ":8080",
		Handler: http.DefaultServeMux,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Fatalf("Server shutdown failed: %v", err)
		}
	}()

	// Start the server
	log.Println("Listening on :8080")
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("HTTP server error: %v", err)
	}
	
	log.Println("Server stopped")
} 