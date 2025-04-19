import Foundation
import CoreData

class PersistenceController {
    static let shared = PersistenceController()
    
    let container: NSPersistentContainer
    
    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "RunstrModel")
        
        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }
        
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Error loading Core Data: \(error.localizedDescription)")
            }
        }
        
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }
    
    // MARK: - Run Methods
    
    func saveRun(_ runData: RunData) {
        let context = container.viewContext
        
        // Check if run already exists
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", runData.id)
        
        do {
            let existingRuns = try context.fetch(fetchRequest)
            
            if let existingRun = existingRuns.first {
                // Update existing run
                existingRun.date = runData.date
                existingRun.distance = runData.distance
                existingRun.duration = Int64(runData.duration)
                existingRun.pace = runData.pace
                existingRun.elevationGain = runData.elevationGain
                existingRun.elevationLoss = runData.elevationLoss
                
                // Convert dictionaries to data
                if let splitsData = try? JSONSerialization.data(withJSONObject: runData.splits) {
                    existingRun.splitsData = splitsData
                }
                
                if let locationsData = try? JSONSerialization.data(withJSONObject: runData.locations) {
                    existingRun.locationsData = locationsData
                }
            } else {
                // Create new run
                _ = runData.toCoreDataEntity(in: context)
            }
            
            try context.save()
        } catch {
            print("Failed to save run: \(error.localizedDescription)")
            context.rollback()
        }
    }
    
    func fetchAllRuns() -> [RunData] {
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "date", ascending: false)]
        
        do {
            let runs = try container.viewContext.fetch(fetchRequest)
            return runs.map { RunData.fromCoreDataEntity($0) }
        } catch {
            print("Failed to fetch runs: \(error.localizedDescription)")
            return []
        }
    }
    
    func deleteRun(id: String) {
        let context = container.viewContext
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", id)
        
        do {
            if let run = try context.fetch(fetchRequest).first {
                context.delete(run)
                try context.save()
            }
        } catch {
            print("Failed to delete run: \(error.localizedDescription)")
            context.rollback()
        }
    }
    
    func updateRunWithNostrFlag(id: String, isPosted: Bool) {
        let context = container.viewContext
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", id)
        
        do {
            if let run = try context.fetch(fetchRequest).first {
                run.isPostedToNostr = isPosted
                try context.save()
            }
        } catch {
            print("Failed to update Nostr flag: \(error.localizedDescription)")
            context.rollback()
        }
    }
    
    func updateRunNote(id: String, note: String) {
        let context = container.viewContext
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", id)
        
        do {
            if let run = try context.fetch(fetchRequest).first {
                run.userNote = note
                try context.save()
            }
        } catch {
            print("Failed to update run note: \(error.localizedDescription)")
            context.rollback()
        }
    }
    
    // MARK: - Statistics Methods
    
    func fetchRunsInDateRange(from startDate: Date, to endDate: Date) -> [RunData] {
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "date >= %@ AND date <= %@", startDate as NSDate, endDate as NSDate)
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "date", ascending: true)]
        
        do {
            let runs = try container.viewContext.fetch(fetchRequest)
            return runs.map { RunData.fromCoreDataEntity($0) }
        } catch {
            print("Failed to fetch runs in date range: \(error.localizedDescription)")
            return []
        }
    }
    
    func calculateTotalDistance() -> Double {
        let fetchRequest: NSFetchRequest<NSFetchRequestResult> = Run.fetchRequest()
        fetchRequest.resultType = .dictionaryResultType
        
        let sumExpression = NSExpression(forFunction: "sum:", arguments: [NSExpression(forKeyPath: "distance")])
        let expressionDescription = NSExpressionDescription()
        expressionDescription.name = "totalDistance"
        expressionDescription.expression = sumExpression
        expressionDescription.expressionResultType = .doubleAttributeType
        
        fetchRequest.propertiesToFetch = [expressionDescription]
        
        do {
            if let results = try container.viewContext.fetch(fetchRequest) as? [[String: Any]],
               let totalDistance = results.first?["totalDistance"] as? Double {
                return totalDistance
            }
        } catch {
            print("Failed to calculate total distance: \(error.localizedDescription)")
        }
        
        return 0
    }
    
    func calculateAveragePace() -> Double {
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "distance > 0") // Only include runs with distance
        
        do {
            let runs = try container.viewContext.fetch(fetchRequest)
            if runs.isEmpty {
                return 0
            }
            
            // Calculate weighted average pace based on distance
            var totalDistance = 0.0
            var weightedPaceSum = 0.0
            
            for run in runs {
                totalDistance += run.distance
                weightedPaceSum += run.pace * run.distance
            }
            
            return totalDistance > 0 ? weightedPaceSum / totalDistance : 0
        } catch {
            print("Failed to calculate average pace: \(error.localizedDescription)")
            return 0
        }
    }
    
    // MARK: - Test Data
    
    func createSampleData() {
        let context = container.viewContext
        
        // First run - a 5K
        let run1 = Run(context: context)
        run1.id = UUID().uuidString
        run1.date = Date().addingTimeInterval(-86400 * 2) // 2 days ago
        run1.distance = 5000 // 5 km
        run1.duration = 1500 // 25 minutes
        run1.pace = 0.3 // 5 min/km pace
        run1.elevationGain = 45
        run1.elevationLoss = 45
        run1.isPostedToNostr = false
        
        // Generate sample splits
        let splits1: [[String: Any]] = [
            ["number": 1, "distance": 1000, "duration": 300, "pace": 0.3],
            ["number": 2, "distance": 1000, "duration": 300, "pace": 0.3],
            ["number": 3, "distance": 1000, "duration": 300, "pace": 0.3],
            ["number": 4, "distance": 1000, "duration": 300, "pace": 0.3],
            ["number": 5, "distance": 1000, "duration": 300, "pace": 0.3]
        ]
        
        if let splitsData = try? JSONSerialization.data(withJSONObject: splits1) {
            run1.splitsData = splitsData
        }
        
        // Second run - a shorter run
        let run2 = Run(context: context)
        run2.id = UUID().uuidString
        run2.date = Date().addingTimeInterval(-86400) // 1 day ago
        run2.distance = 3000 // 3 km
        run2.duration = 900 // 15 minutes
        run2.pace = 0.3 // 5 min/km pace
        run2.elevationGain = 30
        run2.elevationLoss = 30
        run2.isPostedToNostr = true
        run2.userNote = "Felt good today, weather was perfect!"
        
        // Generate sample splits
        let splits2: [[String: Any]] = [
            ["number": 1, "distance": 1000, "duration": 300, "pace": 0.3],
            ["number": 2, "distance": 1000, "duration": 300, "pace": 0.3],
            ["number": 3, "distance": 1000, "duration": 300, "pace": 0.3]
        ]
        
        if let splitsData = try? JSONSerialization.data(withJSONObject: splits2) {
            run2.splitsData = splitsData
        }
        
        // Third run - a longer run
        let run3 = Run(context: context)
        run3.id = UUID().uuidString
        run3.date = Date() // Today
        run3.distance = 10000 // 10 km
        run3.duration = 3600 // 60 minutes
        run3.pace = 0.36 // 6 min/km pace
        run3.elevationGain = 120
        run3.elevationLoss = 120
        run3.isPostedToNostr = false
        
        // Generate sample splits
        let splits3: [[String: Any]] = [
            ["number": 1, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 2, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 3, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 4, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 5, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 6, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 7, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 8, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 9, "distance": 1000, "duration": 360, "pace": 0.36],
            ["number": 10, "distance": 1000, "duration": 360, "pace": 0.36]
        ]
        
        if let splitsData = try? JSONSerialization.data(withJSONObject: splits3) {
            run3.splitsData = splitsData
        }
        
        do {
            try context.save()
        } catch {
            print("Failed to save sample data: \(error.localizedDescription)")
            context.rollback()
        }
    }
} 