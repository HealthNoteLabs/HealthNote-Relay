import Foundation
import CoreLocation

struct RunData: Identifiable, Codable {
    var id: String
    var date: Date
    var distance: Double
    var duration: Int
    var pace: Double
    var elevationGain: Double
    var elevationLoss: Double
    var splits: [[String: Any]]
    var locations: [[String: Any]]
    
    // Computed properties for formatted values
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
            return String(format: "%.0f ft", elevationGain * 3.28084)
        } else {
            return String(format: "%.0f m", elevationGain)
        }
    }
    
    var caloriesBurned: Int {
        // Simple estimation based on MET values for running
        // MET value varies by pace, but we'll use a simplified approach
        let weight = UserDefaults.standard.double(forKey: "userWeight") // in kg
        if weight == 0 {
            return 0 // Can't calculate without weight
        }
        
        // Average MET value for running (varies by pace)
        let metValue: Double
        let paceMinPerKm = (pace * 1000) / 60 // Convert seconds/meter to min/km
        
        if paceMinPerKm < 4.0 {
            metValue = 11.5 // Very fast running
        } else if paceMinPerKm < 5.0 {
            metValue = 10.0 // Fast running
        } else if paceMinPerKm < 6.0 {
            metValue = 9.0 // Moderate fast running
        } else if paceMinPerKm < 7.0 {
            metValue = 8.0 // Moderate running
        } else {
            metValue = 7.0 // Slow running / jogging
        }
        
        // Calories = MET * weight (kg) * duration (hours)
        let durationHours = Double(duration) / 3600
        let calories = metValue * weight * durationHours
        
        return Int(calories)
    }
    
    // Coding keys for Codable implementation
    enum CodingKeys: String, CodingKey {
        case id, date, distance, duration, pace, elevationGain, elevationLoss
        case splitsData = "splits" // Custom coding for complex types
        case locationsData = "locations"
    }
    
    // Custom coding because Dictionary is not directly Codable
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        date = try container.decode(Date.self, forKey: .date)
        distance = try container.decode(Double.self, forKey: .distance)
        duration = try container.decode(Int.self, forKey: .duration)
        pace = try container.decode(Double.self, forKey: .pace)
        elevationGain = try container.decode(Double.self, forKey: .elevationGain)
        elevationLoss = try container.decode(Double.self, forKey: .elevationLoss)
        
        let splitsData = try container.decode(Data.self, forKey: .splitsData)
        splits = try JSONSerialization.jsonObject(with: splitsData) as? [[String: Any]] ?? []
        
        let locationsData = try container.decode(Data.self, forKey: .locationsData)
        locations = try JSONSerialization.jsonObject(with: locationsData) as? [[String: Any]] ?? []
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(date, forKey: .date)
        try container.encode(distance, forKey: .distance)
        try container.encode(duration, forKey: .duration)
        try container.encode(pace, forKey: .pace)
        try container.encode(elevationGain, forKey: .elevationGain)
        try container.encode(elevationLoss, forKey: .elevationLoss)
        
        // Convert dictionaries to data for encoding
        let splitsData = try JSONSerialization.data(withJSONObject: splits)
        try container.encode(splitsData, forKey: .splitsData)
        
        let locationsData = try JSONSerialization.data(withJSONObject: locations)
        try container.encode(locationsData, forKey: .locationsData)
    }
}

// MARK: - CoreData Integration
extension RunData {
    // Convert RunData to CoreData Run entity
    func toCoreDataEntity(in context: NSManagedObjectContext) -> Run {
        let run = Run(context: context)
        run.id = id
        run.date = date
        run.distance = distance
        run.duration = Int64(duration)
        run.pace = pace
        run.elevationGain = elevationGain
        run.elevationLoss = elevationLoss
        
        // Convert the split and location dictionaries to JSON data
        if let splitsData = try? JSONSerialization.data(withJSONObject: splits) {
            run.splitsData = splitsData
        }
        
        if let locationsData = try? JSONSerialization.data(withJSONObject: locations) {
            run.locationsData = locationsData
        }
        
        return run
    }
    
    // Convert from CoreData Run entity to RunData
    static func fromCoreDataEntity(_ entity: Run) -> RunData {
        let splits: [[String: Any]] = {
            guard let data = entity.splitsData,
                  let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return []
            }
            return array
        }()
        
        let locations: [[String: Any]] = {
            guard let data = entity.locationsData,
                  let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return []
            }
            return array
        }()
        
        return RunData(
            id: entity.id ?? UUID().uuidString,
            date: entity.date ?? Date(),
            distance: entity.distance,
            duration: Int(entity.duration),
            pace: entity.pace,
            elevationGain: entity.elevationGain,
            elevationLoss: entity.elevationLoss,
            splits: splits,
            locations: locations
        )
    }
} 