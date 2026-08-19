#if os(iOS)
import PhotosUI
import SwiftUI
import UIKit

struct FoodLogSearchAccessory: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
    @Environment(AppStore.self) private var store

    let loggedAt: Date

    @Namespace private var cameraTransitionNamespace
    @State private var deferredSheet: Sheet?
    @State private var fullScreenDestination: FoodSearchFullScreenDestination?
    @State private var isInputMenuExpanded = false
    @State private var pendingMealPhotoData: Data?
    @State private var presentedSheet: Sheet?
    @State private var searchText = ""
    @State private var selectedMealPhoto: PhotosPickerItem?
    @State private var startedCameraPOC = false
    func body(content: Content) -> some View {
        content
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Color.clear.frame(height: 76)
        }
        .overlay(alignment: .bottom) {
            FoodSearchComposer(
                searchText: $searchText,
                selectedPhoto: $selectedMealPhoto,
                isMenuExpanded: $isInputMenuExpanded,
                cameraTransitionNamespace: cameraTransitionNamespace,
                isCameraPresented: fullScreenDestination != nil,
                onBarcode: showBarcodeScanner,
                onCamera: showCamera,
                onPaste: pasteSearchText,
                onVoiceCapture: analyzeVoice,
                cameraContent: cameraContent
            )
        }
        .onSubmit(of: .text, showSearch)
        .task(id: selectedMealPhoto) {
            await openSelectedMealPhoto()
        }
        .task {
            await startCameraPOCIfNeeded()
        }
        .sheet(item: $presentedSheet, onDismiss: presentDeferredSheet) { sheet in
            switch sheet {
            case .food(let food):
                NavigationStack {
                    FoodLogEditorView(
                        food: food,
                        loggedAt: loggedAt,
                        pendingItemCount: 0,
                        onAdd: logBarcodeFood,
                        onLog: logBarcodeFood
                    )
                }
            case .newCustomFood(let barcode):
                NavigationStack {
                    CustomFoodEditorView(barcode: barcode)
                }
            case .search:
                FoodSearchBrowser(
                    searchText: $searchText,
                    loggedAt: loggedAt,
                    showsModalChrome: true,
                    onLogged: finishLogging
                )
                .monsSheetPresentation()
            case .estimate(let estimate):
                MealEstimateReviewView(estimate: estimate, loggedAt: loggedAt) {
                    finishLogging()
                }
            }
        }
    }

    @ViewBuilder
    private func cameraContent() -> some View {
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
                    onLogged: finishLogging
                )
            }
        }
    }

    private func showSearch() {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        presentedSheet = .search
    }

    private func showBarcodeScanner() {
        fullScreenDestination = .barcode
    }

    private func acceptBarcode(_ value: String) {
        guard let gtin = BarcodeNormalizer.gtin14(value) else {
            dismissCamera()
            return
        }

        Task { @MainActor in
            let food = await store.meals.food(gtin: gtin)
            dismissCamera()
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            presentedSheet = food.map(Sheet.food) ?? .newCustomFood(gtin)
        }
    }

    private func logBarcodeFood(_ item: PendingFoodLogItem) {
        Task { _ = await logBarcodeFood(item) }
    }

    private func logBarcodeFood(_ item: PendingFoodLogItem) async -> Bool {
        let saved = await store.meals.log(items: [item])
        if saved { finishLogging() }
        return saved
    }

    private func showCamera() {
        pendingMealPhotoData = nil
        fullScreenDestination = .mealPhoto
    }

    private func dismissCamera() {
        performSurfaceTransition {
            fullScreenDestination = nil
        }
        pendingMealPhotoData = nil
    }

    private func analyzeVoice(_ data: Data) async {
        guard let estimate = await store.meals.estimate(.voice(data)) else { return }
        presentedSheet = .estimate(estimate)
    }

    private func pasteSearchText() {
        guard let pastedText = UIPasteboard.general.string?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !pastedText.isEmpty else { return }
        searchText = pastedText
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

    private func finishLogging() {
        searchText = ""
        isInputMenuExpanded = false
    }

    private func presentDeferredSheet() {
        guard let deferredSheet else { return }
        self.deferredSheet = nil
        presentedSheet = deferredSheet
    }

    private func startCameraPOCIfNeeded() async {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        guard arguments.contains("-cameraPOC") || arguments.contains("-cameraAutoDismissPOC") else { return }
        guard !startedCameraPOC else { return }
        startedCameraPOC = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(700))
            showCamera()
        }
        #endif
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
}

private extension FoodLogSearchAccessory {
    enum Sheet: Identifiable {
        case estimate(MealEstimate)
        case food(CatalogFood)
        case newCustomFood(String)
        case search

        var id: String {
            switch self {
            case .estimate(let estimate): "estimate-\(estimate.id)"
            case .food(let food): "food-\(food.id)"
            case .newCustomFood(let barcode): "new-custom-food-\(barcode)"
            case .search: "search"
            }
        }
    }
}
#endif
