import Foundation

nonisolated struct NutritionPlanResponse: Decodable, Sendable {
    let plan: NutritionPlan?
}
