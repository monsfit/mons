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
}
