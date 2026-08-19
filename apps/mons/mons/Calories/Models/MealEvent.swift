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

    func rescheduled(to date: Date) -> MealEvent {
        MealEvent(
            id: id,
            title: title,
            category: category,
            loggedAt: date,
            itemCount: itemCount,
            hasPhoto: hasPhoto,
            calories: calories,
            macros: macros
        )
    }
}
