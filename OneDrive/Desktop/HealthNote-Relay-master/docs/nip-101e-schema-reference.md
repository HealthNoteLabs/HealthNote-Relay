# NIP-101e Schema Reference

This document provides a detailed reference for the schema of each event type defined in NIP-101e.

## Exercise Template (kind: 33401)

### Required Tags

| Tag Name | Description | Example |
|----------|-------------|---------|
| `title` | Name of the exercise | `["title", "Barbell Bench Press"]` |
| `type` | Category of exercise | `["type", "strength"]` |

### Optional Tags

| Tag Name | Description | Example |
|----------|-------------|---------|
| `description` | Detailed explanation of the exercise | `["description", "Lie flat on a bench with feet on the ground..."]` |
| `muscle` | Target muscle group(s) | `["muscle", "chest"]`, `["muscle", "triceps"]` |
| `equipment` | Required equipment | `["equipment", "barbell"]`, `["equipment", "bench"]` |
| `measurement` | How exercise progress is tracked | `["measurement", "weight"]`, `["measurement", "reps"]` |
| `difficulty` | Difficulty level (1-5) | `["difficulty", "3"]` |
| `image` | URL to demonstration image | `["image", "https://example.com/bench-press.jpg"]` |
| `video` | URL to demonstration video | `["video", "https://example.com/bench-press-demo.mp4"]` |
| `reference` | Reference to standard exercise database | `["reference", "exrx:BBBenchPress"]` |

### Content Format

The content field should contain a JSON string with additional metadata that doesn't fit in the tag structure, such as:

```json
{
  "instructions": [
    "Lie flat on a bench with feet firmly on the ground",
    "Grip the barbell slightly wider than shoulder width",
    "Lower the bar to mid-chest",
    "Press the bar upward until arms are fully extended"
  ],
  "tips": [
    "Keep wrists straight during the movement",
    "Don't bounce the bar off your chest"
  ],
  "variations": [
    "Close-grip bench press",
    "Wide-grip bench press",
    "Incline bench press"
  ]
}
```

## Workout Template (kind: 33402)

### Required Tags

| Tag Name | Description | Example |
|----------|-------------|---------|
| `title` | Name of the workout | `["title", "Upper Body Strength"]` |
| `type` | Type of workout | `["type", "strength"]`, `["type", "cardio"]` |

### Optional Tags

| Tag Name | Description | Example |
|----------|-------------|---------|
| `description` | Workout overview | `["description", "Focus on chest and shoulders..."]` |
| `duration` | Expected duration in minutes | `["duration", "45"]` |
| `level` | Intended fitness level | `["level", "intermediate"]` |
| `goal` | Training goal | `["goal", "strength"]`, `["goal", "hypertrophy"]` |
| `schedule` | Recommended frequency | `["schedule", "2x weekly"]` |
| `exercise` | Reference to exercise template | `["exercise", "<exercise-event-id>", "3x8", "bench-press"]` |

### Exercise Tag Format

The `exercise` tag has a special format to define exercises within the workout:

```
["exercise", "<event-id>", "<prescription>", "<label>"]
```

Where:
- `<event-id>` is the ID of an exercise template event (optional if label is sufficient)
- `<prescription>` is the sets/reps/params for the exercise (e.g., "3x10", "30sec", "5x5@75%")
- `<label>` is a human-readable identifier (optional if event-id is provided)

Multiple `exercise` tags form the workout structure, in sequence order.

### Content Format

The content field should contain a JSON string with additional information:

```json
{
  "warmup": "5 minute light cardio, followed by dynamic stretching",
  "cooldown": "Static stretching for worked muscle groups",
  "notes": "Rest 60-90 seconds between sets for main exercises",
  "sequence": [
    {
      "name": "Warm-up",
      "exercises": ["Arm circles", "Push-ups", "Band pull-aparts"],
      "parameters": "2 minutes each"
    },
    {
      "name": "Main workout",
      "exercises": ["event1", "event2", "event3"],
      "parameters": "Perform as listed in exercise tags"
    },
    {
      "name": "Finisher",
      "exercises": ["Push-up AMRAP"],
      "parameters": "3 minutes"
    }
  ]
}
```

## Workout Record (kind: 1301)

### Required Tags

| Tag Name | Description | Example |
|----------|-------------|---------|
| `title` | Name of the workout | `["title", "Morning Strength Session"]` |
| `type` | Type of workout | `["type", "strength"]` |
| `started_at` | When workout began (Unix timestamp) | `["started_at", "1681234567"]` |

### Optional Tags

| Tag Name | Description | Example |
|----------|-------------|---------|
| `ended_at` | When workout completed (Unix timestamp) | `["ended_at", "1681236367"]` |
| `duration` | Duration in seconds | `["duration", "1800"]` |
| `workout` | Reference to workout template | `["workout", "<workout-template-id>"]` |
| `exercise` | Exercise performed | `["exercise", "<exercise-id>", "3x8x225lbs", "bench press"]` |
| `split` | Splits for timed activities | `["split", "1", "400m", "01:15"]` |
| `location` | Where workout occurred | `["location", "Home Gym"]` |
| `calories` | Calories burned estimate | `["calories", "350"]` |
| `heart_rate` | Heart rate data | `["heart_rate", "avg:145,max:175"]` |
| `feeling` | Subjective rating (1-10) | `["feeling", "8"]` |
| `health` | Reference to health event | `["health", "<health-event-id>"]` |
| `privacy` | Privacy classification | `["privacy", "private"]` |
| `expires_at` | Data expiration (Unix timestamp) | `["expires_at", "1691234567"]` |

### Content Format

The content field should contain a JSON string with detailed performance data:

```json
{
  "notes": "Felt strong today. Increased weight on final set.",
  "exercises": [
    {
      "id": "<exercise-template-id>",
      "title": "Barbell Bench Press",
      "sets": [
        {"reps": 8, "weight": 205, "unit": "lbs"},
        {"reps": 8, "weight": 215, "unit": "lbs"},
        {"reps": 6, "weight": 225, "unit": "lbs"}
      ],
      "notes": "Last set was challenging but maintained good form"
    },
    {
      "id": "<exercise-template-id>",
      "title": "Pull-ups",
      "sets": [
        {"reps": 10, "weight": 0},
        {"reps": 8, "weight": 0},
        {"reps": 7, "weight": 0}
      ]
    }
  ],
  "metrics": {
    "heartRate": {
      "avg": 145,
      "max": 175,
      "data": [/* Array of time-series heart rate data */]
    },
    "gps": {
      "route": [/* Array of coordinates if outdoor workout */],
      "distance": 5.2,
      "unit": "km",
      "elevation": 120,
      "elevationUnit": "m"
    }
  }
}
```

## Privacy Classification

Events should include a `privacy` tag to indicate the intended visibility:

| Value | Description | Typical Use |
|-------|-------------|-------------|
| `public` | Publicly visible to all | Exercise/workout templates |
| `limited` | Available to follows/friends | Basic workout completion records |
| `private` | Restricted to the user only | Detailed performance data |
| `coaches` | Available to designated coaches | Training data for feedback |

Events without a `privacy` tag default to:
- Exercise Templates (33401): `public`
- Workout Templates (33402): `public`
- Workout Records (1301): `limited`

## Storage Recommendations

| Event Type | Recommended Storage |
|------------|---------------------|
| Public exercise/workout templates | Public relays |
| Limited visibility workout records | Limited relays or Blossom nodes |
| Private workout details | Blossom nodes or encrypted on public relays |

## Query Support

Relay implementations should support efficient queries for:

1. All exercise templates by user
2. Exercise templates by muscle group
3. Workout templates by type
4. Workout records within date ranges
5. Workout records by template reference

See the [HealthNote Relay](https://github.com/healthnote/healthnote-relay) for reference implementation of these query capabilities. 