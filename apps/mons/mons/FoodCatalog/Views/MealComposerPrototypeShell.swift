#if DEBUG && os(iOS)
import PhotosUI
import SwiftUI
import UIKit

struct MealComposerPrototypeShell<Content: View>: View {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
    @Namespace private var cameraTransitionNamespace

    private let content: Content
    private let loggedAt: Date
    private let usesCameraFixture: Bool

    @State private var destination: MealComposerCameraDestination?
    @State private var draft: MealComposerDraft
    @State private var drawerDragOffset: CGFloat = 0
    @State private var drawerMode: MealComposerDrawerMode
    @State private var isContextExpanded: Bool
    @State private var isMenuExpanded = false
    @State private var reviewPhase: MealComposerReview.Phase
    @State private var searchQuery: String
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var sheetDestination: MealComposerFoodSheetDestination?

    init(
        initialDraft: MealComposerDraft = MealComposerDraft(context: "", items: []),
        initialDrawerMode: MealComposerDrawerMode = .collapsed,
        initialReviewPhase: MealComposerReview.Phase = .ready,
        initialSearchQuery: String = "",
        initialSheetDestination: MealComposerFoodSheetDestination? = nil,
        initialCameraDestination: MealComposerCameraDestination? = nil,
        isContextExpanded: Bool = false,
        loggedAt: Date = .now,
        usesCameraFixture: Bool,
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
        self.loggedAt = loggedAt
        self.usesCameraFixture = usesCameraFixture
        _destination = State(initialValue: initialCameraDestination)
        _draft = State(initialValue: initialDraft)
        _drawerMode = State(initialValue: initialDrawerMode)
        _isContextExpanded = State(initialValue: isContextExpanded)
        _reviewPhase = State(initialValue: initialReviewPhase)
        _searchQuery = State(initialValue: initialSearchQuery)
        _sheetDestination = State(initialValue: initialSheetDestination)
    }

    var body: some View {
        content
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: 76)
            }
            .overlay {
                GeometryReader { proxy in
                    ZStack(alignment: .bottom) {
                        MealComposerDrawerBackdrop(
                            isPresented: isDrawerExpanded,
                            opacityProgress: drawerBackdropProgress,
                            onDismiss: collapseDrawer
                        )
                        .zIndex(1)

                        drawerLayer(in: proxy)
                        selectionLayer
                        composer
                    }
                }
            }
            .task(id: selectedPhoto) {
                await addSelectedPhoto()
            }
            .onChange(of: isMenuExpanded, handleMenuChange)
            .sheet(item: $sheetDestination, content: foodSheet)
    }

    @ViewBuilder
    private func drawerLayer(in proxy: GeometryProxy) -> some View {
        if isDrawerExpanded {
            MealComposerPrototypeDrawer(
                mode: drawerMode,
                draft: draft,
                reviewPhase: $reviewPhase,
                onDismiss: collapseDrawer,
                onBack: navigateBackInDrawer,
                onEditItem: editItem,
                onRemoveItem: removeItem,
                onReview: openReview,
                onStartCalculation: startMockCalculation,
                onCompleteCalculation: completeMockCalculation,
                onDragChanged: updateDrawerDrag,
                onDragEnded: endDrawerDrag
            )
            .frame(height: min(proxy.size.height, max(430, proxy.size.height * 0.62)))
            .padding(.horizontal, MonsSpacing.large)
            .padding(.bottom, MonsSpacing.small)
            .offset(y: drawerDragOffset)
            .transition(.move(edge: .bottom))
            .zIndex(2)
        }
    }

    @ViewBuilder
    private var selectionLayer: some View {
        if showsSelectionShelf {
            MealComposerSelectionShelf(
                items: draft.items,
                context: $draft.context,
                isContextExpanded: $isContextExpanded,
                onOpenDraft: openDraftManager
            )
            .padding(.horizontal, MonsSpacing.xLarge)
            .padding(.bottom, 74)
            .transition(.opacity.combined(with: .scale(scale: 0.84, anchor: .bottom)))
            .zIndex(3)
        }
    }

    private var composer: some View {
        FoodSearchComposer(
            searchText: $searchQuery,
            selectedPhoto: $selectedPhoto,
            isMenuExpanded: $isMenuExpanded,
            cameraTransitionNamespace: cameraTransitionNamespace,
            isCameraPresented: destination != nil,
            onBarcode: presentBarcode,
            onCamera: presentCamera,
            onPaste: pasteContext,
            onVoiceCapture: acceptVoiceContext,
            onReview: reviewAction,
            onSearch: presentSearch,
            searchPrompt: "Search foods",
            cameraContent: cameraContent
        )
        .zIndex(4)
    }

    @ViewBuilder
    private func cameraContent() -> some View {
        if let destination {
            MealComposerCameraSurface(
                destination: destination,
                cameraTransitionNamespace: cameraTransitionNamespace,
                usesFixture: usesCameraFixture,
                onDismiss: dismissCamera,
                onBarcode: acceptBarcode,
                onPhoto: acceptCameraPhoto
            )
        }
    }

    @ViewBuilder
    private func foodSheet(_ destination: MealComposerFoodSheetDestination) -> some View {
        switch destination {
        case .search:
            MealComposerFoodSearchSheet(
                query: $searchQuery,
                mealDraft: $draft,
                foods: MealComposerPrototypeFixtures.catalogFoods,
                loggedAt: loggedAt,
                usesScannerFixture: usesCameraFixture,
                onAddToMeal: addExactFood,
                onLog: logExactFood,
                onLogMeal: logMealFromSearch
            )
        case .food(let food):
            MealComposerFoodDetailSheet(
                food: food,
                loggedAt: loggedAt,
                onAddToMeal: addExactFood,
                onLog: logExactFood
            )
        case .edit(let item):
            if let pendingFood = item.pendingFood {
                MealComposerFoodEditSheet(item: pendingFood) { updatedFood in
                    await saveEditedFood(updatedFood, replacing: item.id)
                }
            } else {
                ContentUnavailableView("Food unavailable", systemImage: "exclamationmark.triangle")
            }
        case .newCustomFood(let gtin):
            MealComposerCustomFoodSheet(gtin: gtin)
        }
    }

    private var isDrawerExpanded: Bool {
        drawerMode != .collapsed && destination == nil && !isMenuExpanded
    }

    private var showsSelectionShelf: Bool {
        drawerMode == .collapsed && destination == nil && !isMenuExpanded
    }

    private var reviewAction: (() -> Void)? {
        guard draft.hasContent else { return nil }
        return openReview
    }

    private var drawerBackdropProgress: Double {
        Double(max(0, 1 - min(drawerDragOffset / 220, 1)))
    }

    private func handleMenuChange(_ oldValue: Bool, _ newValue: Bool) {
        guard newValue else { return }
        isContextExpanded = false
        setDrawerMode(.collapsed)
    }

    private func presentSearch() {
        searchQuery = ""
        isContextExpanded = false
        setDrawerMode(.collapsed)
        sheetDestination = .search
    }

    private func addExactFood(_ pendingFood: PendingFoodLogItem) {
        animate {
            draft.items.append(.food(pendingFood))
            searchQuery = ""
            sheetDestination = nil
        }
    }

    private func logExactFood(_ pendingFood: PendingFoodLogItem) async -> Bool {
        guard pendingFood.quantityGrams > 0 else { return false }
        sheetDestination = nil
        return true
    }

    private func logMealFromSearch() {
        guard !draft.knownFoods.isEmpty else { return }
        animate {
            draft.items.removeAll { $0.kind == .food }
            searchQuery = ""
            sheetDestination = nil
        }
    }

    private func editItem(_ item: MealComposerDraftItem) {
        guard item.pendingFood != nil else { return }
        collapseDrawer()
        sheetDestination = .edit(item)
    }

    private func saveEditedFood(_ pendingFood: PendingFoodLogItem, replacing itemID: String) async -> Bool {
        guard let index = draft.items.firstIndex(where: { $0.id == itemID }) else { return false }
        animate {
            draft.items[index] = .food(pendingFood)
            sheetDestination = nil
        }
        return true
    }

    private func removeItem(_ item: MealComposerDraftItem) {
        animate {
            draft.items.removeAll { $0.id == item.id }
        }
    }

    private func addImage(_ data: Data? = nil, source: String) {
        var image = MealComposerPrototypeFixtures.images[draft.images.count % MealComposerPrototypeFixtures.images.count]
        image.id = "meal-photo-draft-\(draft.items.count + 1)"
        image.detail = source
        image.imageData = data
        animate {
            draft.items.append(image)
        }
    }

    private func addSelectedPhoto() async {
        guard let selectedPhoto,
              let data = try? await selectedPhoto.loadTransferable(type: Data.self),
              !Task.isCancelled else { return }

        let normalized = await FoodImageData.normalizedJPEGInBackground(data) ?? data
        guard !Task.isCancelled else { return }
        addImage(normalized, source: "Photo library")
        self.selectedPhoto = nil
    }

    private func acceptCameraPhoto(_ data: Data?) {
        addImage(data, source: "Camera")
    }

    private func pasteContext() {
        let pasted = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let pasted, !pasted.isEmpty else {
            if usesCameraFixture {
                draft.context = "Turkey sandwich with mustard and a small side salad"
                isContextExpanded = true
            }
            return
        }
        draft.context = pasted
        isContextExpanded = true
    }

    private func acceptVoiceContext(_ data: Data) async {
        guard !data.isEmpty else { return }
        if draft.context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            draft.context = "Lunch after a workout with a little extra sauce"
        }
        isContextExpanded = true
    }

    private func presentBarcode() {
        isContextExpanded = false
        setDrawerMode(.collapsed)
        animate {
            destination = .barcode
        }
    }

    private func acceptBarcode(_ value: String) {
        guard let gtin = BarcodeNormalizer.gtin14(value) else {
            dismissCamera()
            return
        }
        let food = MealComposerPrototypeFixtures.scannedFood(gtin: gtin)
        dismissCamera {
            sheetDestination = .food(food)
        }
    }

    private func presentCamera() {
        isContextExpanded = false
        setDrawerMode(.collapsed)
        animate {
            destination = .meal
        }
    }

    private func dismissCamera() {
        dismissCamera(then: {})
    }

    private func dismissCamera(then completion: @escaping () -> Void) {
        if accessibilityReduceMotion {
            isMenuExpanded = false
            destination = nil
            completion()
        } else {
            withAnimation(.smooth(duration: 0.34, extraBounce: 0)) {
                isMenuExpanded = false
                destination = nil
            } completion: {
                completion()
            }
        }
    }

    private func openDraftManager() {
        guard !draft.items.isEmpty else { return }
        isContextExpanded = false
        setDrawerMode(.draft)
    }

    private func openReview() {
        isContextExpanded = false
        reviewPhase = .ready
        setDrawerMode(.review)
    }

    private func startMockCalculation() {
        reviewPhase = .calculating
    }

    private func completeMockCalculation() {
        reviewPhase = .result
    }

    private func navigateBackInDrawer() {
        switch drawerMode {
        case .review:
            setDrawerMode(draft.items.isEmpty ? .collapsed : .draft)
        case .collapsed, .draft:
            collapseDrawer()
        }
    }

    private func collapseDrawer() {
        setDrawerMode(.collapsed)
    }

    private func setDrawerMode(_ mode: MealComposerDrawerMode) {
        if mode != .collapsed {
            drawerDragOffset = 0
        }
        animate {
            drawerMode = mode
        }
    }

    private func updateDrawerDrag(_ translation: CGFloat) {
        var transaction = Transaction()
        transaction.animation = nil
        withTransaction(transaction) {
            drawerDragOffset = translation
        }
    }

    private func endDrawerDrag(_ translation: CGFloat, _ predictedTranslation: CGFloat) {
        if translation > 86 || predictedTranslation > 150 {
            animate {
                drawerMode = .collapsed
            }
        } else {
            withAnimation(.spring(duration: 0.32, bounce: 0)) {
                drawerDragOffset = 0
            }
        }
    }

    private func animate(_ changes: () -> Void) {
        if accessibilityReduceMotion {
            changes()
        } else {
            withAnimation(.smooth(duration: 0.34, extraBounce: 0.02), changes)
        }
    }

}
#endif
