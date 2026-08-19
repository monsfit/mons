import SwiftUI

struct FoodSearchView: View {
    let loggedAt: Date
    let startsWithScanner: Bool
    let onLogged: () -> Void

    @State private var searchText = ""

    init(
        loggedAt: Date,
        startsWithScanner: Bool = false,
        onLogged: @escaping () -> Void
    ) {
        self.loggedAt = loggedAt
        self.startsWithScanner = startsWithScanner
        self.onLogged = onLogged
    }

    var body: some View {
        FoodSearchBrowser(
            searchText: $searchText,
            loggedAt: loggedAt,
            startsWithScanner: startsWithScanner,
            showsModalChrome: true,
            onLogged: onLogged
        )
        .monsSheetPresentation()
    }
}
