import SwiftUI

struct FoodSearchView: View {
    let loggedAt: Date
    let onLogged: () -> Void

    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var brandedResults: [CatalogFood] = []
    @State private var commonResults: [CatalogFood] = []
    @State private var isSearching = false
    @State private var navigationPath = NavigationPath()
    @State private var searchText = ""
    #if os(iOS)
    @State private var isShowingScanner: Bool
    #endif

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
                resultsContent
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

    @ViewBuilder
    private var resultsContent: some View {
        if isSearching {
            HStack {
                Spacer()
                ProgressView("Searching")
                Spacer()
            }
            .listRowSeparator(.hidden)
        } else if commonResults.isEmpty, brandedResults.isEmpty {
            ContentUnavailableView(
                searchText.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
                    ? "No valid foods found"
                    : "Find a food",
                systemImage: "fork.knife",
                description: Text(
                    searchText.count >= 2
                        ? "Try a different food or brand name."
                        : "Search common and branded foods, or scan a barcode."
                )
            )
            .listRowSeparator(.hidden)
        } else {
            foodSection("Common", foods: commonResults)
            foodSection("Branded", foods: brandedResults)
        }
    }

    @ViewBuilder
    private func foodSection(_ title: String, foods: [CatalogFood]) -> some View {
        if !foods.isEmpty {
            Section(title) {
                ForEach(foods) { food in
                    Button {
                        navigationPath.append(food)
                    } label: {
                        FoodSearchResultRow(food: food)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(MonsColor.surface)
                    .listRowSeparatorTint(MonsColor.border)
                }
            }
        }
    }

    private func search() async {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= 2 else {
            commonResults = []
            brandedResults = []
            isSearching = false
            return
        }

        do {
            try await Task.sleep(for: .milliseconds(250))
        } catch {
            return
        }

        isSearching = true
        async let common = store.searchFoods(query, kind: .raw)
        async let branded = store.searchFoods(query, kind: .branded)
        let results = await (common, branded)
        guard !Task.isCancelled else { return }
        commonResults = results.0
        brandedResults = results.1
        isSearching = false
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
