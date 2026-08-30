import PhotosUI
import SwiftUI
#if os(iOS)
import UIKit
#endif

struct FoodSearchBrowser: View {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @Binding var searchText: String

    let loggedAt: Date
    let showsModalChrome: Bool
    let onLogged: () -> Void
    let onSelectIngredient: ((CatalogFood, Double) -> Void)?

    @Namespace private var cameraTransitionNamespace
    @State private var brandedResults: [CatalogFood] = []
    @State private var commonResults: [CatalogFood] = []
    @State private var deferredPresentation: FoodSearchPresentation?
    @State private var fullScreenDestination: FoodSearchFullScreenDestination?
    @State private var isSearching = false
    @State private var isLogging = false
    @State private var isEstimatingMeal = false
    @State private var isInputMenuExpanded = false
    @State private var navigationPath = NavigationPath()
    @State private var pendingItems: [PendingFoodLogItem] = []
    @State private var pendingMealPhotoData: Data?
    @State private var pendingDeletion: CatalogFood?
    @State private var presentation: FoodSearchPresentation?
    @State private var selectedMealPhoto: PhotosPickerItem?
    @State private var selectedScope = FoodSearchScope.all
    private var normalizedSearchText: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var recentFoods: [CatalogFood] {
        let foods = RecentFoodBuilder.foods(pendingItems: pendingItems, entries: store.meals.foodLog)
        return isSelectingIngredient ? foods.filter { $0.datasetKind != .recipe } : foods
    }

    private var customFoods: [CatalogFood] { store.meals.customFoods.map(\.catalogFood) }
    private var recipes: [CatalogFood] { store.meals.recipes.map(\.catalogFood) }

    private var isSelectingIngredient: Bool { onSelectIngredient != nil }

    private var usesSearchComposer: Bool {
        #if os(iOS)
        !showsModalChrome && !isSelectingIngredient
        #else
        false
        #endif
    }

    init(
        searchText: Binding<String>,
        loggedAt: Date,
        startsWithScanner: Bool = false,
        showsModalChrome: Bool,
        onLogged: @escaping () -> Void
    ) {
        _searchText = searchText
        self.loggedAt = loggedAt
        self.showsModalChrome = showsModalChrome
        self.onLogged = onLogged
        onSelectIngredient = nil
        _fullScreenDestination = State(initialValue: startsWithScanner ? .barcode : nil)
    }

    init(
        searchText: Binding<String>,
        startsWithScanner: Bool = false,
        onSelectIngredient: @escaping (CatalogFood, Double) -> Void
    ) {
        _searchText = searchText
        loggedAt = Date()
        showsModalChrome = true
        onLogged = {}
        self.onSelectIngredient = onSelectIngredient
        _fullScreenDestination = State(initialValue: startsWithScanner ? .barcode : nil)
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                FoodSearchBrowseControls(
                    selectedScope: $selectedScope,
                    quickActions: usesSearchComposer
                        ? []
                        : isSelectingIngredient
                            ? [.barcodeScan, .quickAdd]
                            : FoodSearchQuickAction.allCases,
                    scopes: isSelectingIngredient ? [.all, .foods] : FoodSearchScope.allCases,
                    onQuickAction: handleQuickAction
                )
                .listRowInsets(.init(
                    top: MonsSpacing.medium,
                    leading: MonsSpacing.large,
                    bottom: MonsSpacing.medium,
                    trailing: MonsSpacing.large
                ))
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                FoodSearchResultsContent(
                    scope: selectedScope,
                    isSearching: isSearching,
                    searchText: searchText,
                    commonResults: commonResults,
                    brandedResults: brandedResults,
                    recentFoods: recentFoods,
                    customFoods: customFoods,
                    recipes: isSelectingIngredient ? [] : recipes,
                    onSelect: selectFood,
                    onEdit: editLibraryFood,
                    onDelete: deleteLibraryFood
                )
            }
            .monsGroupedContent()
            .scrollDismissesKeyboard(.interactively)
            .foregroundStyle(MonsColor.textPrimary)
            .modifier(
                FoodSearchInputModifier(
                    searchText: $searchText,
                    selectedPhoto: $selectedMealPhoto,
                    isMenuExpanded: $isInputMenuExpanded,
                    cameraTransitionNamespace: cameraTransitionNamespace,
                    isCameraPresented: fullScreenDestination != nil,
                    usesComposer: usesSearchComposer,
                    onBarcode: showScanner,
                    onCamera: showMealCamera,
                    onPaste: pasteSearchText,
                    onVoiceCapture: analyzeInlineVoice,
                    cameraContent: cameraContent
                )
            )
            .overlay {
                if isEstimatingMeal {
                    ProgressView("Analyzing meal")
                        .padding(MonsSpacing.xLarge)
                        .background(.regularMaterial, in: .rect(cornerRadius: MonsRadius.medium))
                        .accessibilityAddTraits(.isModal)
                }
            }
            .navigationTitle(showsModalChrome ? "Add Food" : "Search")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .navigationDestination(for: CatalogFood.self) { food in
                if let onSelectIngredient {
                    FoodLogEditorView(food: food, onSelectIngredient: onSelectIngredient)
                } else {
                    FoodLogEditorView(
                        food: food,
                        loggedAt: loggedAt,
                        pendingItemCount: pendingItems.count,
                        onAdd: addToPending,
                        onLog: logIncluding
                    )
                }
            }
            .task(id: searchText) {
                await search()
            }
            .task(id: selectedScope) {
                if selectedScope == .all {
                    await search()
                }
            }
            .task(id: selectedMealPhoto) {
                await openSelectedMealPhoto()
            }
            .sheet(item: $presentation, onDismiss: presentDeferredPresentation) { destination in
                switch destination {
                case .mealInput(.text):
                    MealTextEstimateView { description in
                        await estimateMeal(.text(description))
                    }
                case .mealInput(.voice):
                    #if os(iOS)
                    MealVoiceCaptureView { data in
                        await requestMealEstimate(.voice(data))
                    } onComplete: { estimate in
                        deferredPresentation = .mealEstimate(estimate)
                    }
                    #else
                    ContentUnavailableView("Voice Log Unavailable", systemImage: "mic.slash")
                    #endif
                case .mealEstimate(let estimate):
                    MealEstimateReviewView(estimate: estimate, loggedAt: loggedAt) {
                        onLogged()
                    }
                case .mealDraft(let draft):
                    MealEstimateReviewView(
                        draft: draft,
                        isUpdating: false,
                        onLogged: finishGroupedLog
                    )
                case .libraryEditor(let editor):
                    NavigationStack {
                        switch editor {
                        case .newCustomFood(let barcode):
                            CustomFoodEditorView(barcode: barcode)
                        case .editCustomFood(let food):
                            CustomFoodEditorView(food: food)
                        case .newRecipe:
                            RecipeEditorView()
                        case .editRecipe(let recipe):
                            RecipeEditorView(recipe: recipe)
                        }
                    }
                    .monsSheetPresentation()
                }
            }
            .confirmationDialog(
                "Delete \(pendingDeletion?.name ?? "item")?",
                isPresented: Binding(
                    get: { pendingDeletion != nil },
                    set: { if !$0 { pendingDeletion = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    if let food = pendingDeletion { confirmDelete(food) }
                    pendingDeletion = nil
                }
                Button("Cancel", role: .cancel) { pendingDeletion = nil }
            } message: {
                Text("Existing timeline entries keep their saved nutrition snapshot.")
            }
            .toolbar {
                if showsModalChrome {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close", action: dismiss.callAsFunction)
                    }

                    ToolbarItem(placement: .primaryAction) {
                        addMenu
                    }

                    #if os(iOS)
                    DefaultToolbarItem(kind: .search, placement: .bottomBar)

                    ToolbarSpacer(.fixed, placement: .bottomBar)

                    ToolbarItem(placement: .bottomBar) {
                        Button("Scan barcode", systemImage: "barcode.viewfinder", action: showScanner)
                    }

                    if !pendingItems.isEmpty, !isSelectingIngredient {
                        ToolbarItem(placement: .bottomBar) {
                            FoodPendingLogButton(
                                count: pendingItems.count,
                                isLogging: isLogging,
                                action: logPending
                            )
                        }
                    }
                    #endif
                } else {
                    #if os(iOS)
                    if !usesSearchComposer {
                        ToolbarItem(placement: .topBarTrailing) {
                            addMenu
                        }
                    }
                    #else
                    ToolbarItem(placement: .primaryAction) {
                        addMenu
                    }
                    #endif

                    if !pendingItems.isEmpty, !isSelectingIngredient {
                        ToolbarItem(placement: .confirmationAction) {
                            FoodPendingLogButton(
                                count: pendingItems.count,
                                isLogging: isLogging,
                                action: logPending
                            )
                        }
                    }
                }

            }
        }
    }

    private var addMenu: some View {
        Menu("Add food", systemImage: "plus") {
            Button("Scan barcode", systemImage: "barcode.viewfinder", action: showScanner)
            if !isSelectingIngredient {
                Button("Describe meal", systemImage: "text.bubble") {
                    presentation = .mealInput(.text)
                }
            }
            Button("Create custom food", systemImage: "square.and.pencil") {
                presentation = .libraryEditor(.newCustomFood(barcode: nil))
            }
            if !isSelectingIngredient {
                Button("Create recipe", systemImage: "book.closed") {
                presentation = .libraryEditor(.newRecipe)
                }
            }
        }
    }

    @ViewBuilder
    private func cameraContent() -> some View {
        #if os(iOS)
        if let destination = fullScreenDestination {
            switch destination {
            case .barcode:
                BarcodeScannerSheet(
                    cameraTransitionNamespace: cameraTransitionNamespace,
                    animatesPresentation: !isInputMenuExpanded,
                    onDismiss: dismissCamera,
                    onScan: acceptBarcode
                )
            case .mealPhoto:
                MealPhotoAnalysisFlowView(
                    initialPhotoData: pendingMealPhotoData,
                    cameraTransitionNamespace: cameraTransitionNamespace,
                    animatesCameraPresentation: !isInputMenuExpanded,
                    loggedAt: loggedAt,
                    onDismiss: dismissCamera,
                    onLogged: onLogged
                )
            }
        }
        #else
        EmptyView()
        #endif
    }

    private func search() async {
        guard selectedScope == .all else {
            isSearching = false
            return
        }

        let query = normalizedSearchText
        guard query.count >= 2 else {
            commonResults = []
            brandedResults = []
            isSearching = false
            return
        }

        isSearching = true

        do {
            try await Task.sleep(for: .milliseconds(250))
        } catch {
            return
        }

        guard !Task.isCancelled else { return }
        defer {
            if normalizedSearchText == query {
                isSearching = false
            }
        }

        async let common = store.meals.searchFoods(query, kind: .raw)
        async let branded = store.meals.searchFoods(query, kind: .branded)
        let results = await (common, branded)
        guard !Task.isCancelled, normalizedSearchText == query else { return }
        commonResults = results.0
        brandedResults = results.1
    }

    private func selectFood(_ food: CatalogFood) {
        guard !isSelectingIngredient || food.datasetKind != .recipe else { return }
        Task {
            let resolved = await store.meals.food(
                datasetKind: food.datasetKind,
                foodId: food.foodId
            ) ?? food
            guard !Task.isCancelled else { return }
            navigationPath.append(resolved)
        }
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

        if items.count > 1 {
            let generated = await store.meals.description(for: items)
            let fallback = items.map(\.food.name).joined(separator: ", ")
            presentation = .mealDraft(
                MealReviewDraft(items: items, description: generated ?? fallback)
            )
            return false
        }

        let saved = await store.meals.log(items: items)
        if saved {
            pendingItems = []
            onLogged()
            if showsModalChrome {
                dismiss()
            }
        }
        return saved
    }

    private func lookupBarcode(_ barcode: String) {
        guard let gtin = BarcodeNormalizer.gtin14(barcode) else { return }
        Task {
            if let food = await store.meals.food(gtin: gtin) {
                navigationPath.append(food)
            } else {
                presentation = .libraryEditor(.newCustomFood(barcode: gtin))
            }
        }
    }

    private func showScanner() {
        #if os(iOS)
        fullScreenDestination = .barcode
        #endif
    }

    private func acceptBarcode(_ value: String) {
        dismissCamera()
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            lookupBarcode(value)
        }
    }

    private func showVoiceLog() {
        presentation = .mealInput(.voice)
    }

    private func analyzeInlineVoice(_ data: Data) async {
        guard let estimate = await requestMealEstimate(.voice(data)) else { return }
        presentation = .mealEstimate(estimate)
    }

    private func showMealCamera() {
        #if os(iOS)
        pendingMealPhotoData = nil
        fullScreenDestination = .mealPhoto
        #endif
    }

    private func dismissCamera() {
        performSurfaceTransition {
            fullScreenDestination = nil
        }
        pendingMealPhotoData = nil
    }

    private func pasteSearchText() {
        #if os(iOS)
        guard let pastedText = UIPasteboard.general.string?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !pastedText.isEmpty else { return }
        searchText = pastedText
        #endif
    }

    private func openSelectedMealPhoto() async {
        guard let selectedMealPhoto,
              let data = try? await selectedMealPhoto.loadTransferable(type: Data.self),
              !Task.isCancelled else { return }

        pendingMealPhotoData = await FoodImageData.normalizedJPEGInBackground(data) ?? data
        guard !Task.isCancelled else { return }
        self.selectedMealPhoto = nil
        fullScreenDestination = .mealPhoto
    }

    private func handleQuickAction(_ action: FoodSearchQuickAction) {
        switch action {
        case .barcodeScan:
            showScanner()
        case .quickAdd:
            presentation = .libraryEditor(.newCustomFood(barcode: nil))
        case .voiceLog:
            showVoiceLog()
        case .mealScan:
            showMealCamera()
        }
    }

    private func estimateMeal(_ request: CreateMealEstimateRequest) async -> Bool {
        guard let estimate = await requestMealEstimate(request) else { return false }

        if case .mealInput = presentation {
            deferredPresentation = .mealEstimate(estimate)
        } else {
            presentation = .mealEstimate(estimate)
        }
        return true
    }

    private func requestMealEstimate(_ request: CreateMealEstimateRequest) async -> MealEstimate? {
        guard !isEstimatingMeal else { return nil }
        isEstimatingMeal = true
        defer { isEstimatingMeal = false }
        return await store.meals.estimate(request)
    }

    private func presentDeferredPresentation() {
        guard let deferredPresentation else { return }
        self.deferredPresentation = nil
        presentation = deferredPresentation
    }

    private func finishGroupedLog() {
        pendingItems = []
        onLogged()
        if showsModalChrome {
            dismiss()
        }
    }

    private func performSurfaceTransition(_ action: () -> Void) {
        if accessibilityReduceMotion {
            action()
        } else {
            withAnimation(.smooth(duration: 0.46, extraBounce: 0)) {
                action()
            }
        }
    }

    private func editLibraryFood(_ food: CatalogFood) {
        guard let id = UUID(uuidString: food.foodId) else { return }
        if food.datasetKind == .custom,
           let custom = store.meals.customFoods.first(where: { $0.id == id }) {
            presentation = .libraryEditor(.editCustomFood(custom))
        } else if food.datasetKind == .recipe,
                  let recipe = store.meals.recipes.first(where: { $0.id == id }) {
            presentation = .libraryEditor(.editRecipe(recipe))
        }
    }

    private func deleteLibraryFood(_ food: CatalogFood) {
        pendingDeletion = food
    }

    private func confirmDelete(_ food: CatalogFood) {
        guard let id = UUID(uuidString: food.foodId) else { return }
        Task {
            if food.datasetKind == .custom {
                _ = await store.meals.deleteCustomFood(id)
            } else if food.datasetKind == .recipe {
                _ = await store.meals.deleteRecipe(id)
            }
        }
    }
}
