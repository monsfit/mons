import SwiftUI

struct FoodSearchView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let loggedAt: Date
    let onLogged: () -> Void

    @State private var brandedResults: [CatalogFood] = []
    @State private var commonResults: [CatalogFood] = []
    @State private var isSearching = false
    @State private var isLogging = false
    @State private var navigationPath = NavigationPath()
    @State private var pendingItems: [PendingFoodLogItem] = []
    @State private var searchText = ""
    #if os(iOS)
    @State private var isShowingScanner: Bool
    #endif

    private var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var recentFoods: [CatalogFood] {
        RecentFoodBuilder.foods(pendingItems: pendingItems, entries: store.foodLog)
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
                    recentFoods: recentFoods,
                    onSelect: selectFood
                )
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(.clear)
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Add Food")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .searchable(
                text: $searchText,
                placement: .toolbar,
                prompt: "Search for a food"
            )
            .navigationDestination(for: CatalogFood.self) { food in
                FoodLogEditorView(
                    food: food,
                    loggedAt: loggedAt,
                    pendingItemCount: pendingItems.count,
                    onAdd: addToPending,
                    onLog: logIncluding
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

                #if os(iOS)
                DefaultToolbarItem(kind: .search, placement: .bottomBar)

                ToolbarSpacer(.flexible, placement: .bottomBar)

                ToolbarItem(placement: .bottomBar) {
                    Button("Scan barcode", systemImage: "barcode.viewfinder", action: showScanner)
                        .buttonStyle(.glassProminent)
                        .tint(MonsColor.action)
                }

                if !pendingItems.isEmpty {
                    ToolbarItem(placement: .bottomBar) {
                        Button(action: logPending) {
                            if isLogging {
                                ProgressView()
                            } else {
                                Label("Log Foods", systemImage: "checkmark")
                            }
                        }
                        .buttonStyle(.glass)
                        .disabled(isLogging)
                        .accessibilityLabel("Log \(pendingItems.count) foods")
                    }
                }
                #endif
            }
        }
        .monsSheetPresentation()
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

    private func addToPending(_ item: PendingFoodLogItem) {
        pendingItems.append(item)
    }

    private func logIncluding(_ item: PendingFoodLogItem) async -> Bool {
        await log(pendingItems + [item])
    }

    private func logPending() {
        Task {
            _ = await log(pendingItems)
        }
    }

    private func log(_ items: [PendingFoodLogItem]) async -> Bool {
        guard !items.isEmpty, !isLogging else { return false }
        isLogging = true
        defer { isLogging = false }

        let saved = await store.log(items: items)
        if saved {
            pendingItems = []
            onLogged()
            dismiss()
        }
        return saved
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
