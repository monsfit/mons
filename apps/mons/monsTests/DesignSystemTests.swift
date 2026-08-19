import SwiftUI
import Testing
@testable import mons

struct DesignSystemTests {
    @Test func nutritionUsesDistinctSemanticAccents() {
        #expect(NutritionColor.calories != NutritionColor.protein)
        #expect(NutritionColor.protein != NutritionColor.fat)
        #expect(NutritionColor.fat != NutritionColor.carbohydrates)
        #expect(NutritionColor.carbohydrates != NutritionColor.calories)
    }
}
