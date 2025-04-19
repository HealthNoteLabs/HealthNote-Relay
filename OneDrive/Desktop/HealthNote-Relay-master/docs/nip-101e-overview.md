# NIP-101e: Workout Events Overview

## Introduction

NIP-101e extends the Nostr protocol with dedicated event kinds for workout and fitness tracking. This specification is part of the broader Health & Fitness NIPs family, enabling decentralized fitness applications while maintaining user privacy and data ownership.

## Core Concepts

### Event Kinds

NIP-101e introduces three specialized event kinds:

| Event Kind | Number | Purpose |
|------------|--------|---------|
| Exercise Template | 33401 | Define reusable exercise components |
| Workout Template | 33402 | Create workout plans composed of exercises |
| Workout Record | 1301 | Record completed workouts with performance data |

### Data Structure Principles

1. **Modularity**: Each event type serves a specific purpose in the fitness tracking ecosystem
2. **Reusability**: Templates can be referenced and reused across multiple workouts
3. **Privacy-aware**: Different privacy levels for different types of workout data
4. **Extensible**: Flexible tag structure allows for different workout types and metrics

### Privacy Model

NIP-101e implements a tiered privacy approach:

- **Public data**: Exercise and workout templates (reusable definitions)
- **Limited data**: Basic workout records (can be shared with coaches/friends)
- **Private data**: Detailed performance metrics (typically for personal use only)

## Key Features

### 1. Exercise Templates (kind: 33401)

Templates define standard exercises with:
- Title and description
- Format specifications (sets, reps, weight, distance, time, etc.)
- Equipment requirements
- Difficulty level and muscle groups
- Training categories

### 2. Workout Templates (kind: 33402)

Templates define workout plans with:
- Title and description
- Exercise selections with prescribed parameters
- Duration, intensity, and scheduling information
- Training type (strength, cardio, flexibility, etc.)

### 3. Workout Records (kind: 1301)

Records document completed workouts with:
- Actual performance data (sets, reps, weights, distances, etc.)
- Start and end times
- Split data for timed activities
- Heart rate, calories, and other physiological metrics
- Notes and additional context

## Integration with Other NIPs

NIP-101e works seamlessly with:

- **NIP-04**: For encrypted private workout data
- **NIP-98**: For authentication when submitting workouts to third parties
- **NIP-51**: For fitness lists and workout collections
- **Health NIPs (32018-32048)**: For referencing health metrics in workout context

## Implementation Considerations

When implementing NIP-101e:

1. **Storage Strategy**: Consider privacy levels when determining where to store events
2. **Query Support**: Implement specialized indexes for efficient workout queries
3. **Reference Handling**: Support resolving references between related events
4. **Privacy Classification**: Ensure proper handling of different privacy levels

## For More Information

For detailed implementation examples, see the [NIP-101e Implementation Guide](./nip-101e-implementation.md) and our [reference implementation](https://github.com/healthnote/healthnote-relay). 