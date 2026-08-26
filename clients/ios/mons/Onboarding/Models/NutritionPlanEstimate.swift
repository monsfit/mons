import Foundation

struct NutritionPlanEstimate: Equatable {
    let calorieTargetKcal: Int
    let estimatedExpenditureKcal: Int
    let estimatedWeeks: Double?
    let rateLimited: Bool
    let restingEnergyKcal: Int
    let weeklyChangeKg: Double
}
