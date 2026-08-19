import SwiftUI

struct MealEstimateReviewView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let isUpdating: Bool
    let onLogged: () -> Void

    @State private var draft: MealReviewDraft
    @State private var hasSaved = false
    @State private var isDescribing = false
    @State private var isConfirmingDelete = false
    @State private var isSaving = false
    @State private var searchText = ""
    @State private var sheet: MealReviewSheet?

    init(
        estimate: MealEstimate,
        loggedAt: Date,
        photoData: Data? = nil,
        onLogged: @escaping () -> Void
    ) {
        isUpdating = false
        self.onLogged = onLogged
        _draft = State(initialValue: MealReviewDraft(
            estimate: estimate,
            loggedAt: loggedAt,
            photoData: photoData
        ))
    }

    init(draft: MealReviewDraft, isUpdating: Bool, onLogged: @escaping () -> Void) {
        self.isUpdating = isUpdating
        self.onLogged = onLogged
        _draft = State(initialValue: draft)
    }

    var body: some View {
        NavigationStack {
            List {
                if let photoData = draft.photoData {
                    MealReviewPhoto(data: photoData)
                        .listRowInsets(.init())
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
                if let transcript = draft.transcript {
                    MealReviewTranscriptSection(transcript: transcript)
                }
                MealReviewDescriptionSection(
                    description: $draft.description,
                    canRewrite: !draft.items.isEmpty,
                    isRewriting: isDescribing,
                    onRewrite: rewriteDescription
                )
                MealReviewScheduleSection(
                    loggedAt: $draft.loggedAt,
                    mealCategory: $draft.mealCategory,
                    allowsDeletion: isUpdating,
                    onDelete: requestDeletion
                )
                Section("Nutrition") {
                    NutritionSummary(
                        calories: draft.calories,
                        protein: draft.protein,
                        totalFat: draft.totalFat,
                        carbohydrates: draft.carbohydrates
                    )
                }
                MealReviewFoodsSection(
                    items: $draft.items,
                    unresolvedItems: $draft.unresolvedItems,
                    onAdd: addFood,
                    onEdit: editFood,
                    onReplace: replaceFood,
                    onResolve: beginResolving
                )
            }
            .monsGroupedContent()
            .navigationTitle(isUpdating ? "Edit Meal" : "Review Meal")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .safeAreaInset(edge: .bottom, spacing: 0) {
                MonsBottomActionBar {
                    Button(action: save) {
                        MonsAsyncActionLabel(
                            title: isUpdating ? "Save Meal" : "Log Meal",
                            loadingTitle: "Saving",
                            systemImage: "fork.knife",
                            isLoading: isSaving
                        )
                        .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.glassProminent)
                    .buttonBorderShape(.capsule)
                    .tint(MonsColor.action)
                    .disabled(!canSave)
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: cancel)
                }
            }
            .confirmationDialog(
                "Delete this meal?",
                isPresented: $isConfirmingDelete,
                titleVisibility: .visible
            ) {
                Button("Delete Meal", role: .destructive, action: deleteMeal)
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("The meal and its saved photo will be permanently removed.")
            }
            .sheet(item: $sheet) { destination in
                switch destination {
                case .edit(let item):
                    NavigationStack {
                        FoodLogEditorView(item: item, onSave: replaceItem)
                            .toolbar {
                                ToolbarItem(placement: .cancellationAction) {
                                    Button("Close") { sheet = nil }
                                }
                            }
                    }
                case .foodSearch:
                    FoodSearchBrowser(searchText: $searchText) { food, quantity in
                        select(food: food, quantityGrams: quantity)
                        sheet = nil
                    }
                }
            }
            .interactiveDismissDisabled(!isUpdating && !hasSaved)
        }
        .monsSheetPresentation()
    }

    private var canSave: Bool {
        !draft.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !draft.items.isEmpty
            && !isSaving
    }

    private func beginResolving(_ name: String) {
        searchText = name
        sheet = .foodSearch(.resolve(name))
    }

    private func addFood() {
        sheet = .foodSearch(.add)
    }

    private func editFood(_ item: PendingFoodLogItem) {
        sheet = .edit(item)
    }

    private func replaceFood(_ item: PendingFoodLogItem) {
        sheet = .foodSearch(.replace(item))
    }

    private func requestDeletion() {
        isConfirmingDelete = true
    }

    private func replaceItem(_ item: PendingFoodLogItem) async -> Bool {
        guard let index = draft.items.firstIndex(where: { $0.id == item.id }) else { return false }
        draft.items[index] = item
        sheet = nil
        return true
    }

    private func select(food: CatalogFood, quantityGrams: Double) {
        guard case .foodSearch(let target) = sheet else { return }
        let replacingItem: PendingFoodLogItem?
        let resolvingUnmatched: String?
        switch target {
        case .add:
            replacingItem = nil
            resolvingUnmatched = nil
        case .replace(let item):
            replacingItem = item
            resolvingUnmatched = nil
        case .resolve(let name):
            replacingItem = nil
            resolvingUnmatched = name
        }
        let item = PendingFoodLogItem(
            entryId: replacingItem?.entryId ?? UUID(),
            food: food,
            loggedAt: draft.loggedAt,
            mealCategory: draft.mealCategory,
            quantityGrams: quantityGrams
        )
        if let replacingItem,
           let index = draft.items.firstIndex(where: { $0.id == replacingItem.id }) {
            draft.items[index] = item
        } else {
            draft.items.append(item)
        }
        if let resolvingUnmatched {
            draft.unresolvedItems.removeAll { $0 == resolvingUnmatched }
        }
        searchText = ""
    }

    private func rewriteDescription() {
        guard !draft.items.isEmpty, !isDescribing else { return }
        isDescribing = true
        Task {
            if let description = await store.meals.description(for: draft.items) {
                draft.description = description
            }
            isDescribing = false
        }
    }

    private func save() {
        guard canSave else { return }
        isSaving = true
        Task {
            let saved = await store.meals.save(draft, updating: isUpdating)
            isSaving = false
            if saved {
                hasSaved = true
                onLogged()
                dismiss()
            }
        }
    }

    private func cancel() {
        if !isUpdating, let estimateId = draft.estimateId {
            Task { await store.meals.discardEstimate(estimateId) }
        }
        dismiss()
    }

    private func deleteMeal() {
        guard isUpdating, !isSaving else { return }
        isSaving = true
        Task {
            let deleted = await store.meals.delete(draft.mealId)
            isSaving = false
            if deleted {
                onLogged()
                dismiss()
            }
        }
    }
}
