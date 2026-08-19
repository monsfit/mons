import Foundation

struct AddMealRequest: Identifiable {
    let scheduledAt: Date
    let mode: AddFoodMode

    init(scheduledAt: Date, mode: AddFoodMode = .search) {
        self.scheduledAt = scheduledAt
        self.mode = mode
    }

    var id: String {
        "\(scheduledAt.timeIntervalSinceReferenceDate)|\(mode.rawValue)"
    }
}
