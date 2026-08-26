import Foundation

struct MealEvent: Identifiable, Hashable {
    let id: String
    let title: String
    let category: MealCategory
    let loggedAt: Date
    let itemCount: Int
    let hasPhoto: Bool
    let calories: Int
    let macros: MacroTotals
}
