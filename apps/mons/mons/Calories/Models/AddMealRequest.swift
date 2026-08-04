import Foundation

struct AddMealRequest: Identifiable {
    let scheduledAt: Date

    var id: Date { scheduledAt }
}
