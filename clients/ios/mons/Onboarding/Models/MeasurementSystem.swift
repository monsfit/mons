import Foundation

nonisolated enum MeasurementSystem: String, CaseIterable, Identifiable, Sendable {
    case imperial
    case metric

    var id: Self { self }

    var title: String {
        switch self {
        case .imperial: "US"
        case .metric: "Metric"
        }
    }

    var weightSymbol: String {
        self == .metric ? "kg" : "lb"
    }

    static var preferred: MeasurementSystem {
        Locale.current.measurementSystem == .metric ? .metric : .imperial
    }

    func displayedWeight(kilograms: Double) -> Double {
        self == .metric ? kilograms : kilograms * 2.204_622_621_8
    }

    func kilograms(displayedWeight: Double) -> Double {
        self == .metric ? displayedWeight : displayedWeight / 2.204_622_621_8
    }
}
