import Foundation

enum FoodSearchQuickAction: String, CaseIterable, Hashable, Identifiable, Sendable {
    case barcodeScan
    case voiceLog
    case mealScan
    case quickAdd

    var id: Self { self }

    var title: String {
        switch self {
        case .barcodeScan:
            "Barcode scan"
        case .voiceLog:
            "Voice log"
        case .mealScan:
            "Meal scan"
        case .quickAdd:
            "Quick add"
        }
    }

    var systemImage: String {
        switch self {
        case .barcodeScan:
            "barcode.viewfinder"
        case .voiceLog:
            "waveform"
        case .mealScan:
            "camera.viewfinder"
        case .quickAdd:
            "plus.circle"
        }
    }

    var isAvailable: Bool {
        #if os(iOS)
        true
        #else
        self == .barcodeScan || self == .quickAdd
        #endif
    }
}
