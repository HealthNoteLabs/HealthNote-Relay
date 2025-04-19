import Foundation
import CoreLocation
import Combine

protocol RunTrackerService {
    var distancePublisher: AnyPublisher<Double, Never> { get }
    var durationPublisher: AnyPublisher<Int, Never> { get }
    var pacePublisher: AnyPublisher<Double, Never> { get }
    var locationsPublisher: AnyPublisher<[CLLocation], Never> { get }
    var elevationPublisher: AnyPublisher<(Double, Double), Never> { get }
    var isTrackingPublisher: AnyPublisher<Bool, Never> { get }
    var isPausedPublisher: AnyPublisher<Bool, Never> { get }
    var splitsPublisher: AnyPublisher<[[String: Any]], Never> { get }
    
    func startTracking()
    func pause()
    func resume()
    func stop() -> RunData
}

class RunTrackerServiceImpl: NSObject, RunTrackerService, CLLocationManagerDelegate {
    // Publishers
    private let distanceSubject = CurrentValueSubject<Double, Never>(0)
    private let durationSubject = CurrentValueSubject<Int, Never>(0)
    private let paceSubject = CurrentValueSubject<Double, Never>(0)
    private let locationsSubject = CurrentValueSubject<[CLLocation], Never>([])
    private let elevationSubject = CurrentValueSubject<(Double, Double), Never>((0, 0)) // (gain, loss)
    private let isTrackingSubject = CurrentValueSubject<Bool, Never>(false)
    private let isPausedSubject = CurrentValueSubject<Bool, Never>(false)
    private let splitsSubject = CurrentValueSubject<[[String: Any]], Never>([])
    
    // Public publishers
    var distancePublisher: AnyPublisher<Double, Never> { distanceSubject.eraseToAnyPublisher() }
    var durationPublisher: AnyPublisher<Int, Never> { durationSubject.eraseToAnyPublisher() }
    var pacePublisher: AnyPublisher<Double, Never> { paceSubject.eraseToAnyPublisher() }
    var locationsPublisher: AnyPublisher<[CLLocation], Never> { locationsSubject.eraseToAnyPublisher() }
    var elevationPublisher: AnyPublisher<(Double, Double), Never> { elevationSubject.eraseToAnyPublisher() }
    var isTrackingPublisher: AnyPublisher<Bool, Never> { isTrackingSubject.eraseToAnyPublisher() }
    var isPausedPublisher: AnyPublisher<Bool, Never> { isPausedSubject.eraseToAnyPublisher() }
    var splitsPublisher: AnyPublisher<[[String: Any]], Never> { splitsSubject.eraseToAnyPublisher() }
    
    // Location tracking
    private let locationManager = CLLocationManager()
    private var locations: [CLLocation] = []
    private var timer: Timer?
    private var startTime: Date?
    private var totalPausedTime: TimeInterval = 0
    private var pauseStartTime: Date?
    
    // Run stats
    private var distance: Double = 0
    private var duration: Int = 0
    private var pace: Double = 0
    private var lastSplitDistance: Double = 0
    private var splits: [[String: Any]] = []
    
    // Elevation tracking
    private var elevationGain: Double = 0
    private var elevationLoss: Double = 0
    private var lastAltitude: Double?
    
    // Constants
    private let splitDistance: Double = 1000 // 1km splits
    private let minimumLocationAccuracy: CLLocationAccuracy = 20 // meters
    private let minimumMovementDistance: CLLocationDistance = 5 // meters
    private let maximumSpeed: Double = 12.5 // m/s (~45 km/h)
    
    override init() {
        super.init()
        setupLocationManager()
    }
    
    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.activityType = .fitness
        locationManager.distanceFilter = 10 // meters
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.showsBackgroundLocationIndicator = true
        locationManager.pausesLocationUpdatesAutomatically = false
    }
    
    func startTracking() {
        // Request permissions if needed
        if locationManager.authorizationStatus == .notDetermined {
            locationManager.requestAlwaysAuthorization()
        }
        
        // Reset tracking variables
        distance = 0
        duration = 0
        pace = 0
        lastSplitDistance = 0
        splits = []
        elevationGain = 0
        elevationLoss = 0
        lastAltitude = nil
        
        // Reset state
        locations = []
        locationsSubject.send([])
        distanceSubject.send(0)
        durationSubject.send(0)
        paceSubject.send(0)
        elevationSubject.send((0, 0))
        splitsSubject.send([])
        
        // Start tracking
        startTime = Date()
        totalPausedTime = 0
        pauseStartTime = nil
        
        startTimer()
        locationManager.startUpdatingLocation()
        
        // Update state
        isTrackingSubject.send(true)
        isPausedSubject.send(false)
    }
    
    func pause() {
        pauseStartTime = Date()
        timer?.invalidate()
        timer = nil
        locationManager.stopUpdatingLocation()
        
        // Update state
        isPausedSubject.send(true)
    }
    
    func resume() {
        if let pauseStart = pauseStartTime {
            totalPausedTime += Date().timeIntervalSince(pauseStart)
            pauseStartTime = nil
        }
        
        startTimer()
        locationManager.startUpdatingLocation()
        
        // Update state
        isPausedSubject.send(false)
    }
    
    func stop() -> RunData {
        locationManager.stopUpdatingLocation()
        timer?.invalidate()
        timer = nil
        
        // Update state
        isTrackingSubject.send(false)
        isPausedSubject.send(false)
        
        // Prepare run data
        let runData = RunData(
            id: UUID().uuidString,
            date: startTime ?? Date(),
            distance: distance,
            duration: duration,
            pace: pace,
            elevationGain: elevationGain,
            elevationLoss: elevationLoss,
            splits: splits,
            locations: locations.map { loc in
                [
                    "latitude": loc.coordinate.latitude,
                    "longitude": loc.coordinate.longitude,
                    "altitude": loc.altitude,
                    "timestamp": loc.timestamp.timeIntervalSince1970
                ]
            }
        )
        
        return runData
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            let currentDuration = self.calculateDuration()
            self.duration = currentDuration
            self.durationSubject.send(currentDuration)
            
            // Update pace every 5 seconds
            if currentDuration % 5 == 0 {
                let currentPace = self.calculatePace()
                self.pace = currentPace
                self.paceSubject.send(currentPace)
            }
        }
        
        // Make sure timer runs even when scrolling
        RunLoop.current.add(timer!, forMode: .common)
    }
    
    private func calculateDuration() -> Int {
        guard let start = startTime else { return 0 }
        
        var pausedDuration: TimeInterval = totalPausedTime
        if let pauseStart = pauseStartTime {
            pausedDuration += Date().timeIntervalSince(pauseStart)
        }
        
        let totalTime = Date().timeIntervalSince(start)
        let adjustedTime = totalTime - pausedDuration
        return Int(max(0, adjustedTime))
    }
    
    private func calculatePace() -> Double {
        if distance > 0 {
            return Double(duration) / distance // seconds per meter
        }
        return 0
    }
    
    // MARK: - CLLocationManagerDelegate
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations newLocations: [CLLocation]) {
        guard let location = newLocations.last, location.horizontalAccuracy <= minimumLocationAccuracy else { return }
        
        // Filter out invalid locations
        if isValidLocation(location) {
            locations.append(location)
            locationsSubject.send(locations)
            
            if locations.count > 1 {
                let previousLocation = locations[locations.count - 2]
                let segmentDistance = location.distance(from: previousLocation)
                
                // Only count movement if it's reasonable
                if segmentDistance >= minimumMovementDistance && isValidMovement(from: previousLocation, to: location) {
                    // Update distance
                    distance += segmentDistance
                    distanceSubject.send(distance)
                    
                    // Check for splits (every 1km by default)
                    checkForSplits(totalDistance: distance)
                    
                    // Track elevation changes
                    trackElevation(currentLocation: location)
                }
            }
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager failed with error: \(error.localizedDescription)")
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            // We can start tracking if needed
            if isTrackingSubject.value && !isPausedSubject.value {
                locationManager.startUpdatingLocation()
            }
        default:
            // Stop tracking if permissions are revoked
            if isTrackingSubject.value {
                pause()
            }
        }
    }
    
    // MARK: - Helper methods
    
    private func isValidLocation(_ location: CLLocation) -> Bool {
        // Basic validation: check accuracy and timestamp
        if location.horizontalAccuracy < 0 || location.horizontalAccuracy > minimumLocationAccuracy {
            return false
        }
        
        // If it's the first location, accept it
        if locations.isEmpty {
            return true
        }
        
        return true
    }
    
    private func isValidMovement(from previousLocation: CLLocation, to currentLocation: CLLocation) -> Bool {
        let distance = currentLocation.distance(from: previousLocation)
        let timeDiff = currentLocation.timestamp.timeIntervalSince(previousLocation.timestamp)
        
        // Skip stationary or nearly stationary points
        if distance < minimumMovementDistance {
            return false
        }
        
        // Calculate speed in m/s
        let speed = timeDiff > 0 ? distance / timeDiff : 0
        
        // Filter out impossibly fast movements (likely GPS errors)
        if speed > maximumSpeed {
            return false
        }
        
        return true
    }
    
    private func checkForSplits(totalDistance: Double) {
        // Calculate how many completed splits we should have
        let completedSplits = Int(totalDistance / splitDistance)
        let currentSplits = splits.count
        
        // If we have new splits to record
        if completedSplits > currentSplits {
            for splitIndex in currentSplits..<completedSplits {
                let splitNumber = splitIndex + 1
                let splitStartDistance = Double(splitIndex) * splitDistance
                let splitEndDistance = Double(splitNumber) * splitDistance
                
                // Find locations that bracket this split
                guard let (beforeSplit, afterSplit) = findLocationsPairForDistance(splitEndDistance) else {
                    continue
                }
                
                // Interpolate the exact time when we crossed the split threshold
                let distBeforeSplit = calculateDistanceFromStart(upTo: beforeSplit)
                let distAfterSplit = calculateDistanceFromStart(upTo: afterSplit)
                let splitDist = splitEndDistance - distBeforeSplit
                let segmentDist = distAfterSplit - distBeforeSplit
                let ratio = splitDist / segmentDist
                
                let timeBeforeSplit = beforeSplit.timestamp.timeIntervalSince1970
                let timeAfterSplit = afterSplit.timestamp.timeIntervalSince1970
                let splitTime = timeBeforeSplit + (timeAfterSplit - timeBeforeSplit) * ratio
                
                // Calculate time for this split
                let splitStartTime: TimeInterval
                if splitIndex == 0 {
                    // First split starts at run start
                    splitStartTime = startTime?.timeIntervalSince1970 ?? 0
                } else {
                    // Get end time of previous split
                    splitStartTime = (splits[splitIndex - 1]["endTime"] as? TimeInterval) ?? 0
                }
                
                let splitDuration = splitTime - splitStartTime
                
                // Calculate pace for this segment
                let segmentDistance = splitEndDistance - splitStartDistance
                let pace = splitDuration / segmentDistance // seconds per meter
                
                // Record split data
                let split: [String: Any] = [
                    "number": splitNumber,
                    "distance": segmentDistance,
                    "startDistance": splitStartDistance,
                    "endDistance": splitEndDistance,
                    "duration": splitDuration,
                    "startTime": splitStartTime,
                    "endTime": splitTime,
                    "pace": pace
                ]
                
                splits.append(split)
            }
            
            splitsSubject.send(splits)
        }
    }
    
    private func findLocationsPairForDistance(_ targetDistance: Double) -> (CLLocation, CLLocation)? {
        guard locations.count >= 2 else { return nil }
        
        var cumulativeDistance: Double = 0
        var previousLocation = locations[0]
        
        for i in 1..<locations.count {
            let currentLocation = locations[i]
            let segmentDistance = currentLocation.distance(from: previousLocation)
            let newDistance = cumulativeDistance + segmentDistance
            
            if newDistance >= targetDistance {
                return (previousLocation, currentLocation)
            }
            
            cumulativeDistance = newDistance
            previousLocation = currentLocation
        }
        
        return nil
    }
    
    private func calculateDistanceFromStart(upTo location: CLLocation) -> Double {
        guard locations.count >= 2, let index = locations.firstIndex(of: location) else {
            return 0
        }
        
        var totalDistance = 0.0
        for i in 1...index {
            totalDistance += locations[i].distance(from: locations[i-1])
        }
        
        return totalDistance
    }
    
    private func trackElevation(currentLocation: CLLocation) {
        let currentAltitude = currentLocation.altitude
        
        if let lastAlt = lastAltitude {
            let altitudeDifference = currentAltitude - lastAlt
            
            // Filter out small fluctuations (under 1 meter)
            if abs(altitudeDifference) >= 1.0 {
                if altitudeDifference > 0 {
                    elevationGain += altitudeDifference
                } else {
                    elevationLoss += abs(altitudeDifference)
                }
                
                // Update the elevation publisher
                elevationSubject.send((elevationGain, elevationLoss))
            }
        }
        
        lastAltitude = currentAltitude
    }
} 