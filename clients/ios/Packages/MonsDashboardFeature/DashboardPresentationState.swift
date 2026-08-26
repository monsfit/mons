import Foundation

public nonisolated struct DashboardPresentationState: Equatable, Sendable {
    public nonisolated struct Macro: Equatable, Sendable {
        public let consumed: Int
        public let target: Int

        public init(consumed: Int, target: Int) {
            self.consumed = consumed
            self.target = target
        }
    }

    public nonisolated struct WeightPoint: Equatable, Sendable {
        public let date: Date
        public let value: Double

        public init(date: Date, value: Double) {
            self.date = date
            self.value = value
        }
    }

    public let calorieGoal: Int
    public let carbohydrates: Macro
    public let consumedCalories: Int
    public let date: Date
    public let fat: Macro
    public let latestWeight: Double?
    public let protein: Macro
    public let recentWorkoutDetail: String?
    public let recentWorkoutTitle: String?
    public let weeklyWorkoutCount: Int
    public let weeklyWorkoutMinutes: Int
    public let weightChange: Double?
    public let weightPoints: [WeightPoint]
    public let weightUnit: String

    public init(
        calorieGoal: Int,
        carbohydrates: Macro,
        consumedCalories: Int,
        date: Date,
        fat: Macro,
        latestWeight: Double?,
        protein: Macro,
        recentWorkoutDetail: String?,
        recentWorkoutTitle: String?,
        weeklyWorkoutCount: Int,
        weeklyWorkoutMinutes: Int,
        weightChange: Double?,
        weightPoints: [WeightPoint],
        weightUnit: String
    ) {
        self.calorieGoal = calorieGoal
        self.carbohydrates = carbohydrates
        self.consumedCalories = consumedCalories
        self.date = date
        self.fat = fat
        self.latestWeight = latestWeight
        self.protein = protein
        self.recentWorkoutDetail = recentWorkoutDetail
        self.recentWorkoutTitle = recentWorkoutTitle
        self.weeklyWorkoutCount = weeklyWorkoutCount
        self.weeklyWorkoutMinutes = weeklyWorkoutMinutes
        self.weightChange = weightChange
        self.weightPoints = weightPoints
        self.weightUnit = weightUnit
    }
}
