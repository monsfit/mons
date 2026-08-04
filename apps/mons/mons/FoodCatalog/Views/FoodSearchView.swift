import SwiftUI

struct FoodSearchView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let loggedAt: Date
    let onLogged: () -> Void

    @State private var brandedResults: [CatalogFood] = []
    @State private var commonResults: [CatalogFood] = []
    @State private var isSearching = false
    @State private var navigationPath = NavigationPath()
    @State private var searchText = ""
    #if os(iOS)
    @State private var isShowingScanner: Bool
    #endif

    private var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    init(
        loggedAt: Date,
        startsWithScanner: Bool = false,
        onLogged: @escaping () -> Void
    ) {
        self.loggedAt = loggedAt
        self.onLogged = onLogged
        #if os(iOS)
        _isShowingScanner = State(initialValue: startsWithScanner)
        #endif
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                FoodSearchResultsContent(
                    isSearching: isSearching,
                    searchText: searchText,
                    commonResults: commonResults,
                    brandedResults: brandedResults,
                    onSelect: selectFood
                )
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(MonsColor.background)
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Add Food")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .navigationDestination(for: CatalogFood.self) { food in
                FoodLogEditorView(food: food, loggedAt: loggedAt) {
                    onLogged()
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                FoodCatalogSearchBar(
                    searchText: $searchText,
                    onScan: showScanner
                )
            }
            .task(id: searchText) {
                await search()
            }
            #if os(iOS)
            .sheet(isPresented: $isShowingScanner) {
                BarcodeScannerSheet { value in
                    isShowingScanner = false
                    lookupBarcode(value)
                }
            }
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: dismiss.callAsFunction)
                }
            }
        }
    }

    private func search() async {
        let query = normalizedSearchText
        guard query.count >= 2 else {
            commonResults = []
            brandedResults = []
            isSearching = false
            return
        }

        do {
            try await Task.sleep(for: .milliseconds(250))
        } catch is CancellationError {
            return
        } catch {
            return
        }

        guard !Task.isCancelled else { return }
        isSearching = true
        defer {
            if normalizedSearchText == query {
                isSearching = false
            }
        }

        async let common = store.searchFoods(query, kind: .raw)
        async let branded = store.searchFoods(query, kind: .branded)
        let results = await (common, branded)
        guard !Task.isCancelled, normalizedSearchText == query else { return }
        commonResults = results.0
        brandedResults = results.1
    }

    private func selectFood(_ food: CatalogFood) {
        navigationPath.append(food)
    }

    private func lookupBarcode(_ barcode: String) {
        guard let gtin = BarcodeNormalizer.gtin14(barcode) else { return }
        Task {
            if let food = await store.food(gtin: gtin) {
                navigationPath.append(food)
            }
        }
    }

    private func showScanner() {
        #if os(iOS)
        isShowingScanner = true
        #endif
    }
}
