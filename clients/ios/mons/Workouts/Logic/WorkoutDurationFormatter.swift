import Foundation

nonisolated enum WorkoutDurationFormatter {
    static func minuteSecond(_ seconds: Int) -> String {
        Duration.seconds(max(seconds, 0)).formatted(.time(pattern: .minuteSecond))
    }
}
