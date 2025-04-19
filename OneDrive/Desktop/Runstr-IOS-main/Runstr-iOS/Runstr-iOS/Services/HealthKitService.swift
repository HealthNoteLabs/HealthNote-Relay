import Foundation
import HealthKit

class HealthKitService {
    static let shared = HealthKitService()
    
    private let healthStore = HKHealthStore()
    
    private let typesToRead: Set<HKObjectType> = {
        guard let distanceRunningWalking = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning),
              let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned),
              let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            fatalError("Cannot create HealthKit read types")
        }
        return [distanceRunningWalking, activeEnergy, steps]
    }()
    
    private let typesToWrite: Set<HKSampleType> = {
        guard let distanceRunningWalking = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning),
              let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            fatalError("Cannot create HealthKit write types")
        }
        return [distanceRunningWalking, activeEnergy, HKObjectType.workoutType()]
    }()
    
    private init() {
        // Private initializer for singleton
    }
    
    func isHealthDataAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }
    
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard isHealthDataAvailable() else {
            completion(false, nil)
            return
        }
        
        healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, error in
            completion(success, error)
        }
    }
    
    func saveRunWorkout(runData: RunData, completion: @escaping (Bool, Error?) -> Void) {
        guard isHealthDataAvailable() else {
            completion(false, nil)
            return
        }
        
        // Calculate calories if not already provided
        let calories = Double(runData.caloriesBurned)
        
        // Create the workout
        let workout = HKWorkout(
            activityType: .running,
            start: runData.date,
            end: runData.date.addingTimeInterval(TimeInterval(runData.duration)),
            duration: TimeInterval(runData.duration),
            totalEnergyBurned: calories > 0 ? HKQuantity(unit: .kilocalorie(), doubleValue: calories) : nil,
            totalDistance: HKQuantity(unit: .meter(), doubleValue: runData.distance),
            metadata: createWorkoutMetadata(for: runData)
        )
        
        // Save the workout
        healthStore.save(workout) { success, error in
            if success {
                // Save associated samples (distance and calories)
                self.saveAssociatedSamples(runData: runData, workout: workout) { samplesSuccess, samplesError in
                    completion(samplesSuccess, samplesError)
                }
            } else {
                completion(success, error)
            }
        }
    }
    
    private func saveAssociatedSamples(runData: RunData, workout: HKWorkout, completion: @escaping (Bool, Error?) -> Void) {
        guard let distanceType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning),
              let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else {
            completion(false, nil)
            return
        }
        
        // Create distance sample
        let distanceSample = HKQuantitySample(
            type: distanceType,
            quantity: HKQuantity(unit: .meter(), doubleValue: runData.distance),
            start: runData.date,
            end: runData.date.addingTimeInterval(TimeInterval(runData.duration))
        )
        
        // Create energy sample if calories are available
        var samples: [HKSample] = [distanceSample]
        
        if runData.caloriesBurned > 0 {
            let energySample = HKQuantitySample(
                type: energyType,
                quantity: HKQuantity(unit: .kilocalorie(), doubleValue: Double(runData.caloriesBurned)),
                start: runData.date,
                end: runData.date.addingTimeInterval(TimeInterval(runData.duration))
            )
            samples.append(energySample)
        }
        
        // Add route data if available and we have sufficient location points
        if runData.locations.count > 2 {
            self.createAndSaveWorkoutRoute(for: workout, from: runData) { routeSuccess, routeError in
                if !routeSuccess {
                    print("Failed to save workout route: \(routeError?.localizedDescription ?? "Unknown error")")
                }
            }
        }
        
        // Save the samples
        healthStore.add(samples, to: workout) { success, error in
            completion(success, error)
        }
    }
    
    private func createWorkoutMetadata(for runData: RunData) -> [String: Any] {
        var metadata: [String: Any] = [
            HKMetadataKeyIndoorWorkout: false
        ]
        
        if !runData.userNote.isEmpty {
            metadata[HKMetadataKeyWorkoutBrandName] = "Runstr"
            metadata["userNote"] = runData.userNote
        }
        
        // Add elevation data if available
        if runData.elevationGain > 0 {
            metadata["elevationGain"] = runData.elevationGain
            metadata["elevationLoss"] = runData.elevationLoss
        }
        
        return metadata
    }
    
    private func createAndSaveWorkoutRoute(for workout: HKWorkout, from runData: RunData, completion: @escaping (Bool, Error?) -> Void) {
        // Convert location dictionaries to CLLocation objects
        var locations: [CLLocation] = []
        
        for locationDict in runData.locations {
            guard let latitude = locationDict["latitude"] as? Double,
                  let longitude = locationDict["longitude"] as? Double,
                  let timestamp = locationDict["timestamp"] as? TimeInterval else {
                continue
            }
            
            let location = CLLocation(
                coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
                altitude: locationDict["altitude"] as? Double ?? 0,
                horizontalAccuracy: locationDict["horizontalAccuracy"] as? Double ?? 10,
                verticalAccuracy: locationDict["verticalAccuracy"] as? Double ?? 10,
                timestamp: Date(timeIntervalSince1970: timestamp)
            )
            
            locations.append(location)
        }
        
        // Ensure we have enough locations to create a route
        guard locations.count >= 2 else {
            completion(false, nil)
            return
        }
        
        // Create a route builder
        let routeBuilder = HKWorkoutRouteBuilder(healthStore: healthStore, device: nil)
        
        // Insert locations into the route
        routeBuilder.insertRouteData(locations) { success, error in
            if success {
                // Finish building the route
                routeBuilder.finishRoute(with: workout, metadata: nil) { route, finishError in
                    completion(route != nil, finishError)
                }
            } else {
                completion(false, error)
            }
        }
    }
    
    // MARK: - Retrieve Health Data
    
    func fetchRecentRunningDistance(days: Int, completion: @escaping (Double, Error?) -> Void) {
        guard let distanceType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) else {
            completion(0, nil)
            return
        }
        
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate)!
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        let query = HKStatisticsQuery(
            quantityType: distanceType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            guard let result = result, let sum = result.sumQuantity() else {
                completion(0, error)
                return
            }
            
            let totalDistance = sum.doubleValue(for: .meter())
            completion(totalDistance, nil)
        }
        
        healthStore.execute(query)
    }
    
    func fetchUserWeight(completion: @escaping (Double?, Error?) -> Void) {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            completion(nil, nil)
            return
        }
        
        let query = HKStatisticsQuery(
            quantityType: weightType,
            quantitySamplePredicate: nil,
            options: .mostRecent
        ) { _, result, error in
            guard let result = result, let weight = result.mostRecentQuantity() else {
                completion(nil, error)
                return
            }
            
            let weightInKg = weight.doubleValue(for: .gramUnit(with: .kilo))
            completion(weightInKg, nil)
        }
        
        healthStore.execute(query)
    }
    
    func fetchRunningWorkouts(limit: Int = 10, completion: @escaping ([HKWorkout]?, Error?) -> Void) {
        let workoutPredicate = HKQuery.predicateForWorkouts(with: .running)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        
        let query = HKSampleQuery(
            sampleType: .workoutType(),
            predicate: workoutPredicate,
            limit: limit,
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            guard let workouts = samples as? [HKWorkout] else {
                completion(nil, error)
                return
            }
            
            completion(workouts, nil)
        }
        
        healthStore.execute(query)
    }
} 