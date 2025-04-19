import Foundation
import Combine
import SwiftUI
import CoreLocation

class RunViewModel: ObservableObject {
    // MARK: - Published properties
    @Published var distance: Double = 0
    @Published var duration: Int = 0
    @Published var pace: Double = 0
    @Published var elevationData: (gain: Double, loss: Double) = (0, 0)
    @Published var locations: [CLLocation] = []
    @Published var isTracking: Bool = false
    @Published var isPaused: Bool = false
    @Published var splits: [[String: Any]] = []
    @Published var currentRegion: MKCoordinateRegion = MKCoordinateRegion()
    @Published var lastRun: RunData?
    @Published var showingSaveSuccess: Bool = false
    @Published var showingSaveError: Bool = false
    @Published var savingRun: Bool = false
    
    // MARK: - Private properties
    private let runTracker: RunTrackerService
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init(runTracker: RunTrackerService = RunTrackerServiceImpl()) {
        self.runTracker = runTracker
        setupBindings()
    }
    
    // MARK: - Methods
    
    private func setupBindings() {
        runTracker.distancePublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.distance = value
            }
            .store(in: &cancellables)
        
        runTracker.durationPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.duration = value
            }
            .store(in: &cancellables)
        
        runTracker.pacePublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.pace = value
            }
            .store(in: &cancellables)
        
        runTracker.elevationPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.elevationData = value
            }
            .store(in: &cancellables)
        
        runTracker.locationsPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] locations in
                self?.locations = locations
                if let mostRecentLocation = locations.last {
                    self?.updateRegion(for: mostRecentLocation)
                }
            }
            .store(in: &cancellables)
        
        runTracker.isTrackingPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.isTracking = value
            }
            .store(in: &cancellables)
        
        runTracker.isPausedPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.isPaused = value
            }
            .store(in: &cancellables)
        
        runTracker.splitsPublisher
            .receive(on: RunLoop.main)
            .sink { [weak self] value in
                self?.splits = value
            }
            .store(in: &cancellables)
    }
    
    func startRun() {
        runTracker.startTracking()
    }
    
    func pauseRun() {
        runTracker.pause()
    }
    
    func resumeRun() {
        runTracker.resume()
    }
    
    func stopRun() {
        let runData = runTracker.stop()
        self.lastRun = runData
        
        saveRun(runData)
    }
    
    private func saveRun(_ runData: RunData) {
        savingRun = true
        
        // Save to Core Data
        PersistenceController.shared.saveRun(runData)
        
        // Save to HealthKit
        HealthKitService.shared.saveRunWorkout(runData: runData) { success, error in
            DispatchQueue.main.async {
                self.savingRun = false
                
                if success {
                    self.showingSaveSuccess = true
                } else {
                    print("Error saving to HealthKit: \(error?.localizedDescription ?? "Unknown error")")
                    self.showingSaveError = true
                }
            }
        }
    }
    
    private func updateRegion(for location: CLLocation) {
        // If we already have a region, update it to center on the new location but maintain the zoom level
        if currentRegion.span.latitudeDelta > 0 {
            currentRegion.center = location.coordinate
        } else {
            // Initialize with a reasonable zoom level for running
            currentRegion = MKCoordinateRegion(
                center: location.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        }
    }
    
    // MARK: - Formatted values
    
    var formattedDistance: String {
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let value = distanceUnit == "km" ? distance / 1000 : distance / 1609.34
        return String(format: "%.2f %@", value, distanceUnit)
    }
    
    var formattedDuration: String {
        let hours = duration / 3600
        let minutes = (duration % 3600) / 60
        let seconds = duration % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
    
    var formattedPace: String {
        if pace == 0 {
            return "--:--"
        }
        
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let multiplier = distanceUnit == "km" ? 1000 : 1609.34
        
        // Pace is in seconds per meter, convert to minutes per km or mile
        let paceInMinutesPerUnit = pace * multiplier / 60
        let minutes = Int(paceInMinutesPerUnit)
        let seconds = Int((paceInMinutesPerUnit - Double(minutes)) * 60)
        
        return String(format: "%d:%02d min/%@", minutes, seconds, distanceUnit)
    }
    
    var formattedElevation: String {
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        if distanceUnit == "mi" {
            // Convert to feet for imperial
            return String(format: "%.0f ft", elevationData.gain * 3.28084)
        } else {
            return String(format: "%.0f m", elevationData.gain)
        }
    }
} 