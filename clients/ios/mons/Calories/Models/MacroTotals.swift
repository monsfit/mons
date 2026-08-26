import Foundation

struct MacroTotals: Hashable {
    let protein: Int
    let carbohydrates: Int
    let fat: Int

    static let zero = MacroTotals(protein: 0, carbohydrates: 0, fat: 0)

    static func + (lhs: MacroTotals, rhs: MacroTotals) -> MacroTotals {
        MacroTotals(
            protein: lhs.protein + rhs.protein,
            carbohydrates: lhs.carbohydrates + rhs.carbohydrates,
            fat: lhs.fat + rhs.fat
        )
    }
}
