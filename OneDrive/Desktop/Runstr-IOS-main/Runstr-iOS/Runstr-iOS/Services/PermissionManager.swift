import Foundation
import CoreLocation
import HealthKit

class PermissionManager: NSObject, ObservableObject {
    // Location permission status
    @Published var locationStatus: CLAuthorizationStatus = .notDetermined
    
    // HealthKit permission status
    @Published var healthKitPermissionGranted: Bool = false
    
    // Motion permission status
    @Published var motionPermissionGranted: Bool = false
    
    // Managers
    private let locationManager = CLLocationManager()
    private let healthKitService = HealthKitService.shared
    
    override init() {
        super.init()
        
        locationManager.delegate = self
        
        // Initialize with current status
        locationStatus = locationManager.authorizationStatus
        
        // Check if HealthKit is available
        healthKitPermissionGranted = healthKitService.isHealthDataAvailable()
    }
    
    // MARK: - Location Permission
    
    func requestLocationPermission(completion: @escaping (Bool) -> Void) {
        let status = locationManager.authorizationStatus
        
        switch status {
        case .notDetermined:
            // We need to request authorization
            locationManager.requestAlwaysAuthorization()
            // The result will be handled by the delegate
            // Store the completion handler to be called later
            self.locationCompletionHandler = completion
            
        case .restricted, .denied:
            // User has denied or restricted location access
            completion(false)
            
        case .authorizedAlways, .authorizedWhenInUse:
            // User has already granted permission
            completion(true)
            
        @unknown default:
            completion(false)
        }
    }
    
    // MARK: - HealthKit Permission
    
    func requestHealthPermission(completion: @escaping (Bool) -> Void) {
        guard healthKitService.isHealthDataAvailable() else {
            healthKitPermissionGranted = false
            completion(false)
            return
        }
        
        healthKitService.requestAuthorization { success, error in
            DispatchQueue.main.async {
                self.healthKitPermissionGranted = success
                completion(success)
                
                if let error = error {
                    print("HealthKit authorization error: \(error.localizedDescription)")
                }
            }
        }
    }
    
    // MARK: - Helpers
    
    // Store completion handler for asynchronous location permission requests
    private var locationCompletionHandler: ((Bool) -> Void)?
}

// MARK: - CLLocationManagerDelegate

extension PermissionManager: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        locationStatus = manager.authorizationStatus
        
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            // Permission granted, allow location-based features
            locationCompletionHandler?(true)
            
        case .denied, .restricted:
            // Permission denied, disable location features
            locationCompletionHandler?(false)
            
        case .notDetermined:
            // Still waiting for user to accept prompt
            break
            
        @unknown default:
            locationCompletionHandler?(false)
        }
        
        locationCompletionHandler = nil
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager failed with error: \(error.localizedDescription)")
        
        locationCompletionHandler?(false)
        locationCompletionHandler = nil
    }
} 