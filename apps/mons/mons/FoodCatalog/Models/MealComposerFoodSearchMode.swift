#if DEBUG && os(iOS)
import Foundation

enum MealComposerFoodSearchMode: String, CaseIterable, Identifiable {
    case scan
    case search
    case quickAdd
    case library

    var id: Self { self }

    var title: String {
        switch self {
        case .scan: "Scan"
        case .search: "Search"
        case .quickAdd: "Quick Add"
        case .library: "Library"
        }
    }

    var systemImage: String {
        switch self {
        case .scan: "barcode.viewfinder"
        case .search: "magnifyingglass"
        case .quickAdd: "text.badge.plus"
        case .library: "books.vertical"
        }
    }
}
#endif
