#if DEBUG && os(iOS)
import SwiftUI
import UIKit

struct MealComposerFoodSearchSheet: View {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @Binding var query: String
    @Binding var mealDraft: MealComposerDraft
    let foods: [CatalogFood]
    let usesScannerFixture: Bool
    let onAddToMeal: (PendingFoodLogItem) -> Void
    let onLog: (PendingFoodLogItem) async -> Bool
    let onLogMeal: () -> Void

    @FocusState private var isSearchFocused: Bool
    @State private var isDatePickerPresented = false
    @State private var isResolvingBarcode = false
    @State private var navigationPath: [CatalogFood] = []
    @State private var quickAddBarcode = ""
    @State private var selectedLoggedAt: Date
    @State private var selectedMode = MealComposerFoodSearchMode.search
    @State private var selectedDetent: PresentationDetent = .medium
    @State private var showsMealSummary = false

    init(
        query: Binding<String>,
        mealDraft: Binding<MealComposerDraft>,
        foods: [CatalogFood],
        loggedAt: Date,
        initialMode: MealComposerFoodSearchMode = .search,
        initiallyShowsMealSummary: Bool = false,
        usesScannerFixture: Bool = false,
        onAddToMeal: @escaping (PendingFoodLogItem) -> Void,
        onLog: @escaping (PendingFoodLogItem) async -> Bool,
        onLogMeal: @escaping () -> Void
    ) {
        _query = query
        _mealDraft = mealDraft
        self.foods = foods
        self.usesScannerFixture = usesScannerFixture
        self.onAddToMeal = onAddToMeal
        self.onLog = onLog
        self.onLogMeal = onLogMeal
        _selectedLoggedAt = State(initialValue: loggedAt)
        _selectedMode = State(initialValue: initialMode)
        _selectedDetent = State(
            initialValue: initialMode == .scan || initialMode == .quickAdd || initiallyShowsMealSummary
                ? .large
                : .medium
        )
        _showsMealSummary = State(initialValue: initiallyShowsMealSummary)
    }

    private var availableFoods: [CatalogFood] {
        let libraryFoods = store.meals.customFoods.map(\.catalogFood)
            + store.meals.recipes.map(\.catalogFood)
        var seenIDs = Set<String>()
        return (foods + libraryFoods).filter { seenIDs.insert($0.id).inserted }
    }

    private var visibleFoods: [CatalogFood] {
        switch selectedMode {
        case .search:
            availableFoods
        case .library:
            availableFoods.filter { $0.datasetKind == .custom || $0.datasetKind == .recipe }
        case .scan, .quickAdd:
            []
        }
    }

    private var mealItemCount: Int {
        mealDraft.knownFoods.count
    }

    private var mealCalories: Int {
        mealDraft.exactCalories
    }

    private var mealDateLabel: String {
        let calendar = Calendar.current
        let day = calendar.isDateInToday(selectedLoggedAt)
            ? "Today"
            : selectedLoggedAt.formatted(.dateTime.month(.abbreviated).day())
        return "\(day) • \(selectedLoggedAt.formatted(.dateTime.hour()))"
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            VStack(spacing: 0) {
                MealComposerFoodSearchModeBar(
                    selection: $selectedMode
                )
                .padding(.horizontal, MonsSpacing.large)
                .padding(.top, MonsSpacing.small)
                .padding(.bottom, MonsSpacing.small)

                Group {
                    if showsMealSummary {
                        MealComposerFoodSearchMealSummary(
                            draft: $mealDraft,
                            onLogMeal: onLogMeal
                        )
                    } else {
                        switch selectedMode {
                        case .scan:
                            MealComposerFoodSearchScanner(
                                usesFixture: usesScannerFixture,
                                onScan: acceptScannedBarcode
                            )
                            .ignoresSafeArea(.container, edges: .bottom)
                            .overlay {
                                if isResolvingBarcode {
                                    ProgressView("Finding food")
                                        .padding(MonsSpacing.xLarge)
                                        .glassEffect(.regular, in: .rect(cornerRadius: 20))
                                }
                            }
                        case .search, .library:
                            MealComposerFoodSearchBrowseContent(
                                query: $query,
                                foods: visibleFoods,
                                searchFocus: $isSearchFocused,
                                mealItemCount: mealItemCount,
                                mealCalories: mealCalories,
                                onSelect: select,
                                onQuickAdd: quickAdd,
                                onLogMeal: onLogMeal
                            )
                        case .quickAdd:
                            MealComposerFoodQuickAddView(
                                barcode: quickAddBarcode,
                                onAdd: quickAdd
                            )
                            .id(quickAddBarcode)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                MealComposerFoodSearchHeader(
                    dateLabel: mealDateLabel,
                    selectedDate: $selectedLoggedAt,
                    isDatePickerPresented: $isDatePickerPresented,
                    calories: mealCalories,
                    calorieGoal: store.calorieGoal,
                    showsMealSummary: showsMealSummary,
                    onClose: dismiss.callAsFunction,
                    onToggleMealSummary: toggleMealSummary
                )
            }
            .toolbarBackgroundVisibility(.visible, for: .navigationBar)
            .navigationDestination(for: CatalogFood.self) { food in
                FoodLogEditorView(
                    food: food,
                    loggedAt: selectedLoggedAt,
                    pendingItemCount: mealItemCount,
                    onAdd: onAddToMeal,
                    onLog: onLog
                )
                .toolbar(.visible, for: .navigationBar)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(
            accessibilityReduceMotion ? nil : .smooth(duration: 0.24, extraBounce: 0),
            value: selectedMode
        )
        .animation(
            accessibilityReduceMotion ? nil : .smooth(duration: 0.24, extraBounce: 0),
            value: showsMealSummary
        )
        .presentationDetents([.medium, .large], selection: $selectedDetent)
        .presentationDragIndicator(.visible)
        .task(activateSearch)
        .onChange(of: selectedMode) { _, mode in
            handleModeChange(mode)
        }
        .onChange(of: selectedLoggedAt) { _, newDate in
            updateDraftLoggedAt(newDate)
        }
    }

    private func activateSearch() async {
        await Task.yield()
        guard !Task.isCancelled else { return }
        focusSearchIfNeeded()
    }

    private func select(_ food: CatalogFood) {
        isSearchFocused = false
        selectedDetent = .large
        Task {
            let resolved = await store.meals.food(
                datasetKind: food.datasetKind,
                foodId: food.foodId
            ) ?? food
            guard !Task.isCancelled else { return }
            navigationPath.append(resolved)
        }
    }

    private func quickAdd(_ food: CatalogFood) {
        let quantityGrams = food.portions.first?.amount ?? food.nutrientBasis.amount
        let pendingFood = PendingFoodLogItem(
            entryId: UUID(),
            food: food,
            loggedAt: selectedLoggedAt,
            quantityGrams: quantityGrams
        )
        mealDraft.items.append(.food(pendingFood))
    }

    private func updateDraftLoggedAt(_ loggedAt: Date) {
        mealDraft.items = mealDraft.items.map { item in
            guard let pendingFood = item.pendingFood else { return item }
            return .food(
                PendingFoodLogItem(
                    entryId: pendingFood.entryId,
                    food: pendingFood.food,
                    loggedAt: loggedAt,
                    quantityGrams: pendingFood.quantityGrams
                )
            )
        }
    }

    private func handleModeChange(_ mode: MealComposerFoodSearchMode) {
        showsMealSummary = false
        if mode == .scan || mode == .quickAdd {
            selectedDetent = .large
        }
        focusSearchIfNeeded()
    }

    private func toggleMealSummary() {
        isSearchFocused = false
        showsMealSummary.toggle()
        if showsMealSummary {
            selectedDetent = .large
        }
    }

    private func focusSearchIfNeeded() {
        guard !showsMealSummary, selectedMode == .search || selectedMode == .library else {
            isSearchFocused = false
            return
        }
        Task { @MainActor in
            await Task.yield()
            isSearchFocused = true
        }
    }

    private func acceptScannedBarcode(_ value: String) {
        guard let gtin = BarcodeNormalizer.gtin14(value) else { return }
        if usesScannerFixture {
            navigationPath.append(MealComposerPrototypeFixtures.scannedFood(gtin: gtin))
            return
        }

        isResolvingBarcode = true
        Task { @MainActor in
            defer { isResolvingBarcode = false }
            if let food = await store.meals.food(gtin: gtin) {
                navigationPath.append(food)
            } else {
                quickAddBarcode = gtin
                selectedMode = .quickAdd
            }
        }
    }
}

#Preview("Native food search") {
    @Previewable @State var query = "chicken"
    @Previewable @State var mealDraft = MealComposerDraft(
        context: "",
        items: Array(MealComposerPrototypeFixtures.searchFoods.prefix(1))
    )

    MealComposerFoodSearchPreviewStage {
        MealComposerFoodSearchSheet(
            query: $query,
            mealDraft: $mealDraft,
            foods: MealComposerPrototypeFixtures.catalogFoods,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            onAddToMeal: { _ in },
            onLog: { _ in true },
            onLogMeal: {}
        )
        .environment(AppStore.preview)
    }
}

#Preview("Native food search without a meal") {
    @Previewable @State var query = "chicken"
    @Previewable @State var mealDraft = MealComposerDraft(context: "", items: [])

    MealComposerFoodSearchPreviewStage {
        MealComposerFoodSearchSheet(
            query: $query,
            mealDraft: $mealDraft,
            foods: MealComposerPrototypeFixtures.catalogFoods,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            onAddToMeal: { _ in },
            onLog: { _ in true },
            onLogMeal: {}
        )
        .environment(AppStore.preview)
    }
}

#Preview("Food library search") {
    @Previewable @State var query = ""
    @Previewable @State var mealDraft = MealComposerDraft(context: "", items: [])

    MealComposerFoodSearchPreviewStage {
        MealComposerFoodSearchSheet(
            query: $query,
            mealDraft: $mealDraft,
            foods: MealComposerPrototypeFixtures.catalogFoods,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            initialMode: .library,
            onAddToMeal: { _ in },
            onLog: { _ in true },
            onLogMeal: {}
        )
        .environment(AppStore.preview)
    }
}

#Preview("Barcode scanner workspace") {
    @Previewable @State var query = ""
    @Previewable @State var mealDraft = MealComposerDraft(context: "", items: [])

    MealComposerFoodSearchPreviewStage {
        MealComposerFoodSearchSheet(
            query: $query,
            mealDraft: $mealDraft,
            foods: MealComposerPrototypeFixtures.catalogFoods,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            initialMode: .scan,
            usesScannerFixture: true,
            onAddToMeal: { _ in },
            onLog: { _ in true },
            onLogMeal: {}
        )
        .environment(AppStore.preview)
    }
}

#Preview("Quick add workspace") {
    @Previewable @State var query = ""
    @Previewable @State var mealDraft = MealComposerDraft(context: "", items: [])

    MealComposerFoodSearchPreviewStage {
        MealComposerFoodSearchSheet(
            query: $query,
            mealDraft: $mealDraft,
            foods: MealComposerPrototypeFixtures.catalogFoods,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            initialMode: .quickAdd,
            onAddToMeal: { _ in },
            onLog: { _ in true },
            onLogMeal: {}
        )
        .environment(AppStore.preview)
    }
}

#Preview("Selected meal summary") {
    @Previewable @State var query = ""
    @Previewable @State var mealDraft = MealComposerDraft(
        context: "",
        items: Array(MealComposerPrototypeFixtures.searchFoods.prefix(2))
    )

    MealComposerFoodSearchPreviewStage {
        MealComposerFoodSearchSheet(
            query: $query,
            mealDraft: $mealDraft,
            foods: MealComposerPrototypeFixtures.catalogFoods,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            initiallyShowsMealSummary: true,
            onAddToMeal: { _ in },
            onLog: { _ in true },
            onLogMeal: {}
        )
        .environment(AppStore.preview)
    }
}
#endif
