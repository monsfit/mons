import Foundation

nonisolated enum OnboardingStep: Int, CaseIterable, Sendable {
    case metabolism
    case birthdate
    case height
    case weight
    case exercise
    case activity
    case expenditure
    case goal
    case targetWeight
    case rate
    case complete
}
