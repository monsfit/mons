import Foundation

struct CalorieTimingPoint: Identifiable, Hashable {
    var id: Date { date }

    let date: Date
    let calories: Int
}
