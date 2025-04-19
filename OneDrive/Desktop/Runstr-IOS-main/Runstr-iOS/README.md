# Runstr iOS

A native iOS fitness tracking application for runners, built using Swift and SwiftUI with full HealthKit integration.

## Features

- **Run Tracking**: Track your runs with GPS and display real-time statistics
- **Background Tracking**: Continue tracking even when the app is in the background
- **HealthKit Integration**: Sync your runs with Apple Health
- **Run History**: View and manage your past runs
- **Statistics**: Analyze your running performance with detailed statistics
- **Customizable Settings**: Set your preferences for distance units and more
- **Nostr Integration**: Share your runs on the Nostr network

## Requirements

- iOS 15.0+
- Xcode 13.0+
- Swift 5.5+
- iPhone with GPS capabilities

## Installation

1. Clone this repository
2. Open `Runstr-iOS.xcodeproj` in Xcode
3. Configure your signing profile in Xcode
4. Build and run the application on your device

## Architecture

The app is built using the MVVM (Model-View-ViewModel) architecture:

- **Models**: Core data entities and data structures
- **Views**: SwiftUI views for the user interface
- **ViewModels**: Data processing and business logic
- **Services**: Core functionality like location tracking and persistence

## Core Technologies

- **SwiftUI**: For building the user interface
- **Combine**: For reactive programming and data binding
- **Core Location**: For GPS tracking
- **HealthKit**: For health and fitness data integration
- **Core Data**: For local data persistence
- **MapKit**: For displaying maps and routes

## Permissions

The app requires several permissions to function properly:

- Location Services (Always/When In Use)
- HealthKit
- Motion & Fitness

## Development

### Project Structure

- `Models/`: Data models and Core Data entities
- `Views/`: SwiftUI views for the user interface
- `Services/`: Service classes for core functionality
- `Utils/`: Utility functions and extensions
- `Resources/`: Asset files and resources

### Key Components

- `RunTrackerService`: Handles location tracking and run metrics
- `PersistenceController`: Manages Core Data operations
- `HealthKitService`: Interfaces with Apple's HealthKit
- `RunViewModel`: Provides data and actions for the run tracking view

## Converting from Android

This iOS app is a native reimplementation of the Runstr Android app, with the following major changes:

1. Complete rewrite in Swift (from Kotlin)
2. Redesigned UI with SwiftUI (from XML layouts)
3. Replaced Room database with Core Data
4. Replaced Google Maps with MapKit
5. Replaced Android location services with Core Location
6. Added HealthKit integration (Android used custom fitness tracking)
7. Implemented iOS background modes for continuous tracking

## License

[Include license information here]

## Acknowledgements

- Original Runstr Android app by HealthNoteLabs
- All contributors to the iOS version 