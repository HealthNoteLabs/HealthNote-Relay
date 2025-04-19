# HealthNote-Relay Project Brief

## Project Overview
HealthNote-Relay is a specialized Nostr relay for health and fitness data with Blossom integration. It provides a privacy-focused platform for health and fitness data sharing while enabling social features.

## Core Requirements
1. Implement a Go-based Nostr relay using the fiatjaf/relayer framework
2. Create a Blossom node for private health data storage
3. Develop a hybrid storage architecture with smart data routing
4. Implement end-to-end encryption for sensitive health metrics
5. Support Nostr NIPs for health data (32018-32048)
6. Enable social features like fitness challenges and comparative metrics
7. Provide user-controlled data retention policies

## Project Goals
- Create a privacy-centric platform for health and fitness data
- Establish a three-tiered privacy model for different health metrics
- Enable seamless integration between traditional relays and Blossom nodes
- Build a client SDK for easy application development
- Make health data sharing more secure and user-controlled

## Project Structure
- `/relay`: Go-based main relay implementation
- `/blossom`: Node.js-based Blossom server
- `/client-sdk`: TypeScript client SDK
- `docker-compose.yml`: Containerization and local deployment

## Current Status
The project is in early development with basic skeleton structure in place. Key components like relay, blossom node, and client SDK have empty placeholder implementations that need to be expanded. 