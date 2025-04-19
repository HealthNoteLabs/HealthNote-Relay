import Foundation
import CoreData

extension Run {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<Run> {
        return NSFetchRequest<Run>(entityName: "Run")
    }

    @NSManaged public var id: String?
    @NSManaged public var date: Date?
    @NSManaged public var distance: Double
    @NSManaged public var duration: Int64
    @NSManaged public var pace: Double
    @NSManaged public var elevationGain: Double
    @NSManaged public var elevationLoss: Double
    @NSManaged public var splitsData: Data?
    @NSManaged public var locationsData: Data?
    @NSManaged public var isPostedToNostr: Bool
    @NSManaged public var userNote: String?
} 