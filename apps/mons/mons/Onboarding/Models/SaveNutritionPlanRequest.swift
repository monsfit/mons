import Foundation

nonisolated struct SaveNutritionPlanRequest: Encodable, Sendable {
    let birthDate: String
    let currentWeightKg: Double
    let dailyActivity: DailyActivity
    let exerciseFrequency: ExerciseFrequency
    let heightCm: Double
    let metabolicSex: MetabolicSex
    let targetWeightKg: Double
    let weeklyWeightChangePercent: Double
    let weightGoal: WeightGoal
}
