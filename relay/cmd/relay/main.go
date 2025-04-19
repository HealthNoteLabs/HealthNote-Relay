package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("Health & Fitness Relay for Nostr starting...")
	log.Fatal(http.ListenAndServe(":8080", nil))
} 