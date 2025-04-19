# NIP-101e Implementation Guide: Workout Events

This guide documents the implementation of NIP-101e (Workout Events) in the HealthNote-Relay system. It includes detailed examples of how to create, store, and query workout-related events through our relay, Blossom node, and client SDK components.

## Table of Contents
- [Introduction to NIP-101e](#introduction-to-nip-101e)
- [Event Types](#event-types)
- [Privacy Classification](#privacy-classification)
- [Event Examples](#event-examples)
- [Client SDK Usage](#client-sdk-usage)
- [Querying Workout Data](#querying-workout-data)
- [Event References](#event-references)
- [Advanced Usage](#advanced-usage)

## Introduction to NIP-101e

NIP-101e extends the Nostr protocol to support workout and fitness tracking with three specialized event kinds:

1. **Exercise Templates** (kind: 33401) - Define reusable exercise components
2. **Workout Templates** (kind: 33402) - Create workout plans composed of exercises
3. **Workout Records** (kind: 1301) - Record completed workouts with performance data

These event kinds follow standard Nostr conventions while providing structured data formats for fitness tracking.

## Event Types

### Exercise Template (kind: 33401)

Exercise templates define reusable exercise components that can be referenced in workout templates and records. They include:

- Basic exercise information (title, description)
- Format specifications (distance, duration, reps, sets, weight, etc.)
- Equipment requirements
- Difficulty levels

### Workout Template (kind: 33402)

Workout templates define workout plans composed of multiple exercises. They include:

- Workout information (title, description) 
- References to exercise templates
- Duration and intensity specifications
- Type classification (strength, cardio, flexibility, etc.)

### Workout Record (kind: 1301)

Workout records document completed workouts with actual performance data. They include:

- Workout information (title, type)
- Time period (start and end times)
- References to exercises performed
- Performance metrics (sets, reps, weights, distances, etc.)
- Additional context (notes, weather, location, etc.)

## Privacy Classification

Workout events follow a three-tier privacy model:

| Event Type | Default Privacy | Description |
|------------|----------------|-------------|
| Exercise Template (33401) | Public | Typically shared publicly as they contain no personal data |
| Workout Template (33402) | Public | Usually shared publicly but can be private |
| Workout Record (1301) | Limited | Contains personal performance data, default is limited sharing |

The privacy level can be explicitly set using the `privacy` or `privacy_level` tag with values:
- `public`: Visible to everyone
- `limited` or `friends`: Visible to a restricted audience
- `private`: Sensitive data with additional protection

## Event Examples

### Exercise Template Example

```json
{
  "kind": 33401,
  "created_at": 1714503722,
  "pubkey": "79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea",
  "content": "Barbell Bench Press is a compound pushing exercise targeting the chest, shoulders, and triceps.",
  "tags": [
    ["d", "8f49e884-d36d-4fa0-899c-a94403e3c712"],
    ["title", "Barbell Bench Press"],
    ["format", "sets", "reps", "weight"],
    ["format_units", "", "", "kg"],
    ["equipment", "barbell", "bench"],
    ["difficulty", "intermediate"],
    ["t", "strength"],
    ["t", "chest"],
    ["t", "compound"],
    ["privacy", "public"]
  ],
  "id": "16e95f8a23fa6cc3e60f1ec6dafbe8ff2a9815f40a48cb46962e4a2a84bfcc89",
  "sig": "32fb5ca6c5cf8ad1a1be5ef16e971c6dc23dea66d88c24899093c792eb7ba0c19b15d3db8aef8b08f79b1248da9c7d6dce7c980f0a3ce8067e68d4a92f33b77c"
}
```

### Workout Template Example

```json
{
  "kind": 33402,
  "created_at": 1714503800,
  "pubkey": "79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea",
  "content": "Upper body strength routine focusing on chest, shoulders, and arms.",
  "tags": [
    ["d", "b721f8c9-1e12-4a7e-8a2a-42f8d5773762"],
    ["title", "Upper Body Strength Workout"],
    ["type", "strength"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:8f49e884-d36d-4fa0-899c-a94403e3c712", "wss://relay.healthnote.com", "3", "10,8,6", "70,75,80"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:c52ae3d4-085b-4f75-a231-806848e370c1", "wss://relay.healthnote.com", "3", "10", "20"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:e6b1510a-3e8c-484e-bafc-3129de9b12a8", "wss://relay.healthnote.com", "3", "12", "15"],
    ["duration", "3600", "seconds"],
    ["difficulty", "intermediate"],
    ["t", "strength"],
    ["t", "upper_body"],
    ["privacy", "public"]
  ],
  "id": "af7d1e49d1e0d9c687a8385b43a96c89b2b2a0d4c6b41a88fc8e69fcd3e79341",
  "sig": "a8f6cb523e2c85e671f2bc6d7e27f755adaa07d7b374125d69ae494ecd09a8c8c5a3b5daef2fd6516ea2c8a068bb2b5caf859b51dbb0af6afca7c8dbe7238a93"
}
```

### Workout Record Example

```json
{
  "kind": 1301,
  "created_at": 1714504000,
  "pubkey": "79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea",
  "content": "Good workout today. Really pushed myself on the bench press and managed to increase weight on the final set.",
  "tags": [
    ["d", "65b0ef6d-7237-4a7a-85b0-1245cf78dde5"],
    ["title", "Monday Upper Body"],
    ["type", "strength"],
    ["start", "1714500000"],
    ["end", "1714503600"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:8f49e884-d36d-4fa0-899c-a94403e3c712", "wss://relay.healthnote.com", "3", "10,8,6", "70,75,85"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:c52ae3d4-085b-4f75-a231-806848e370c1", "wss://relay.healthnote.com", "3", "10,10,8", "20,20,20"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:e6b1510a-3e8c-484e-bafc-3129de9b12a8", "wss://relay.healthnote.com", "3", "12,12,10", "15,15,15"],
    ["heart_rate_avg", "142", "bpm"],
    ["calories", "320", "kcal"],
    ["completed", "true"],
    ["t", "workout"],
    ["t", "strength"],
    ["t", "upper_body"],
    ["privacy", "limited"]
  ],
  "id": "6248c8e950c8cc7b27ac5901f36d5c59e451a2c8da1ad32c84126fcb432dc7a9",
  "sig": "df3bd6f9e3fa2189b5365b1ed39ba94a5f5a19d1de7c69764ba278c9428aa1e9ce47f2f171d3a33442c3d616c7fd8403e84d0051fd3a4a65ab4d6fb9396bee86"
}
```

### Running Workout Record Example with Splits

```json
{
  "kind": 1301,
  "created_at": 1714510000,
  "pubkey": "79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea",
  "content": "Morning 5K run felt great! Perfect weather conditions.",
  "tags": [
    ["d", "3ab9c8d7-4e56-4f18-b2ca-1a45e9c87f32"],
    ["title", "Morning 5K Run"],
    ["type", "cardio"],
    ["start", "1714506000"],
    ["end", "1714507800"],
    ["exercise", "33401:79c3db32be8871d58e1731f9c9266121572d930f5ca6b5745bf1b0e8c3a5deea:5d7c39a8-b2f1-4e9a-ab52-726ebab8f7c2", "wss://relay.healthnote.com", "5.04", "1800", "5:57"],
    ["split", "1", "1000", "m", "5:45", "140", "bpm"],
    ["split", "2", "1000", "m", "5:52", "145", "bpm"],
    ["split", "3", "1000", "m", "6:02", "152", "bpm"],
    ["split", "4", "1000", "m", "6:10", "155", "bpm"],
    ["split", "5", "1000", "m", "5:55", "158", "bpm"],
    ["heart_rate_avg", "150", "bpm"],
    ["heart_rate_max", "162", "bpm"],
    ["cadence_avg", "172", "spm"],
    ["calories", "450", "kcal"],
    ["elevation_gain", "45", "m"],
    ["weather_temp", "18", "c"],
    ["weather_condition", "partly_cloudy"],
    ["completed", "true"],
    ["t", "running"],
    ["t", "cardio"],
    ["privacy", "public"]
  ],
  "id": "9a7b5c3d1e8f2a0b4c6d8e9f2a3b5c7d9e8f2a1b3c5d7e9f2a4b6c8d0e2f4a6",
  "sig": "8ed7f6a1c2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
}
```

## Client SDK Usage

Our client SDK provides convenient methods for working with NIP-101e workout events. Here are some examples:

### Creating an Exercise Template

```typescript
import { HealthNostrClient, PrivacyLevel } from 'health-nostr-client';

// Create client instance
const client = new HealthNostrClient({
  mainRelay: 'wss://relay.healthnote.com',
  privateKey: 'your_private_key'
});

// Connect to relays
await client.connect();

// Create exercise template
const benchPressTemplate = {
  title: 'Barbell Bench Press',
  description: 'Compound pushing exercise targeting the chest, shoulders, and triceps.',
  format: ['sets', 'reps', 'weight'],
  formatUnits: ['', '', 'kg'],
  equipment: ['barbell', 'bench'],
  difficulty: 'intermediate',
  tags: [
    ['t', 'strength'],
    ['t', 'chest'],
    ['t', 'compound']
  ],
  privacyLevel: PrivacyLevel.Public
};

// Publish exercise template
const templateId = await client.publishExerciseTemplate(benchPressTemplate);
console.log(`Published exercise template with ID: ${templateId}`);
```

### Creating a Workout Template

```typescript
import { HealthNostrClient, PrivacyLevel } from 'health-nostr-client';

// Create client instance
const client = new HealthNostrClient({
  mainRelay: 'wss://relay.healthnote.com',
  privateKey: 'your_private_key'
});

// Connect to relays
await client.connect();

// Create workout template
const upperBodyTemplate = {
  title: 'Upper Body Strength Workout',
  description: 'Upper body strength routine focusing on chest, shoulders, and arms.',
  type: 'strength',
  duration: 3600, // seconds
  difficulty: 'intermediate',
  exercises: [
    '33401:pubkey:d-id-of-bench-press', 
    '33401:pubkey:d-id-of-shoulder-press',
    '33401:pubkey:d-id-of-bicep-curl'
  ],
  tags: [
    ['t', 'strength'],
    ['t', 'upper_body']
  ],
  privacyLevel: PrivacyLevel.Public
};

// Publish workout template
const workoutTemplateId = await client.publishWorkoutTemplate(upperBodyTemplate);
console.log(`Published workout template with ID: ${workoutTemplateId}`);
```

### Recording a Completed Workout

```typescript
import { HealthNostrClient, PrivacyLevel } from 'health-nostr-client';

// Create client instance
const client = new HealthNostrClient({
  mainRelay: 'wss://relay.healthnote.com',
  privateKey: 'your_private_key'
});

// Connect to relays
await client.connect();

// Create workout record
const workoutRecord = {
  title: 'Monday Upper Body',
  type: 'strength',
  startTime: 1714500000,
  endTime: 1714503600,
  exercises: [
    ['33401:pubkey:d-id-of-bench-press', 'wss://relay.healthnote.com', '3', '10,8,6', '70,75,85'],
    ['33401:pubkey:d-id-of-shoulder-press', 'wss://relay.healthnote.com', '3', '10,10,8', '20,20,20'],
    ['33401:pubkey:d-id-of-bicep-curl', 'wss://relay.healthnote.com', '3', '12,12,10', '15,15,15']
  ],
  completed: true,
  notes: 'Good workout today. Really pushed myself on the bench press and managed to increase weight on the final set.',
  tags: [
    ['heart_rate_avg', '142', 'bpm'],
    ['calories', '320', 'kcal'],
    ['t', 'workout'],
    ['t', 'strength'],
    ['t', 'upper_body']
  ],
  privacyLevel: PrivacyLevel.Limited
};

// Publish workout record
const workoutRecordId = await client.publishWorkoutRecord(workoutRecord);
console.log(`Published workout record with ID: ${workoutRecordId}`);
```

### Recording a Running Workout with Splits

```typescript
import { HealthNostrClient, PrivacyLevel } from 'health-nostr-client';

// Create client instance
const client = new HealthNostrClient({
  mainRelay: 'wss://relay.healthnote.com',
  privateKey: 'your_private_key'
});

// Connect to relays
await client.connect();

// Create running workout record
const runningWorkout = {
  title: 'Morning 5K Run',
  type: 'cardio',
  startTime: 1714506000,
  endTime: 1714507800,
  exercises: [
    ['33401:pubkey:d-id-of-running', 'wss://relay.healthnote.com', '5.04', '1800', '5:57']
  ],
  completed: true,
  notes: 'Morning 5K run felt great! Perfect weather conditions.',
  tags: [
    ['split', '1', '1000', 'm', '5:45', '140', 'bpm'],
    ['split', '2', '1000', 'm', '5:52', '145', 'bpm'],
    ['split', '3', '1000', 'm', '6:02', '152', 'bpm'],
    ['split', '4', '1000', 'm', '6:10', '155', 'bpm'],
    ['split', '5', '1000', 'm', '5:55', '158', 'bpm'],
    ['heart_rate_avg', '150', 'bpm'],
    ['heart_rate_max', '162', 'bpm'],
    ['cadence_avg', '172', 'spm'],
    ['calories', '450', 'kcal'],
    ['elevation_gain', '45', 'm'],
    ['weather_temp', '18', 'c'],
    ['weather_condition', 'partly_cloudy'],
    ['t', 'running'],
    ['t', 'cardio']
  ],
  privacyLevel: PrivacyLevel.Public
};

// Publish running record
const runningRecordId = await client.publishWorkoutRecord(runningWorkout);
console.log(`Published running workout record with ID: ${runningRecordId}`);
```

## Querying Workout Data

The client SDK provides methods for querying workout data from both the main relay and Blossom nodes:

### Get Exercise Templates

```typescript
// Get all exercise templates
const exerciseTemplates = await client.getExerciseTemplates();

// Get specific exercise templates by author
const authorTemplates = await client.getExerciseTemplates({
  authors: ['pubkey1', 'pubkey2']
});

// Get exercise templates with specific tags
const chestExercises = await client.getExerciseTemplates({
  '#t': ['chest']
});
```

### Get Workout Templates

```typescript
// Get all workout templates
const workoutTemplates = await client.getWorkoutTemplates();

// Get specific workout templates by author
const authorWorkouts = await client.getWorkoutTemplates({
  authors: ['pubkey1']
});

// Get strength workout templates
const strengthWorkouts = await client.getWorkoutTemplates({
  '#type': ['strength']
});
```

### Get Workout Records

```typescript
// Get workout records for a specific time period
const recentWorkouts = await client.getWorkoutRecords({
  since: Math.floor(Date.now() / 1000) - 604800 // Last week
});

// Get workouts by type
const cardioWorkouts = await client.getWorkoutRecords({
  '#type': ['cardio']
});

// Get your own workout records
const myWorkouts = await client.getWorkoutRecords({
  authors: [client.getPublicKey()]
});
```

## Event References

NIP-101e enables rich relationships between events:

1. **Workout Records referencing Exercise Templates**:
   ```
   ["exercise", "33401:pubkey:template-d-identifier", "relay-url", "data1", "data2", ...]
   ```

2. **Workout Records referencing Workout Templates**:
   ```
   ["workout_template", "33402:pubkey:template-d-identifier", "relay-url"]
   ```

3. **Workout Records referencing Health Metrics**:
   ```
   ["health_metric", "32020:pubkey:heart-rate-d-identifier", "relay-url"]
   ```

4. **Workout Templates referencing Exercise Templates**:
   ```
   ["exercise", "33401:pubkey:template-d-identifier", "relay-url", "prescription1", "prescription2", ...]
   ```

This reference system allows applications to build rich networks of health and fitness data while maintaining event independence.

## Advanced Usage

### GPS and Route Data for Outdoor Workouts

For outdoor activities like running, cycling, and hiking, GPS data can be included:

```typescript
// Example of adding polyline-encoded GPS data
const runningWorkout = {
  // ... other fields ...
  tags: [
    // ... other tags ...
    ['gps_data', 'polyline-encoded-string'],
    ['gps_format', 'polyline'],
    ['gps_points', '121'], // Number of data points
  ]
};
```

### Workout Records with Health Metric References

You can reference other health metrics from workout records:

```typescript
const workoutRecord = {
  // ... other fields ...
  tags: [
    // ... other tags ...
    ['heart_rate', '32020:pubkey:metric-d-identifier', 'relay-url'],
    ['body_weight', '32023:pubkey:metric-d-identifier', 'relay-url'],
    ['sleep', '32030:pubkey:metric-d-identifier', 'relay-url']
  ]
};
```

### Privacy-Aware Publishing

The client SDK automatically determines the appropriate storage based on privacy level:

```typescript
// Private workout goes to Blossom node if available
const privateWorkout = {
  // ... other fields ...
  privacyLevel: PrivacyLevel.Private
};

// Public workout stored on main relay
const publicWorkout = {
  // ... other fields ...
  privacyLevel: PrivacyLevel.Public
};
```

## Conclusion

This implementation of NIP-101e enables comprehensive workout and fitness tracking within the Nostr ecosystem. By leveraging our relay, Blossom nodes, and client SDK, developers can create privacy-aware fitness applications that give users full control over their health data.

For more information about the ultra-modular approach to health and fitness data, see the [Health & Fitness NIPs proposal](../docs/health-fitness-nips-proposal.md). 