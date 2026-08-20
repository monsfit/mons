#if DEBUG && os(iOS)
import SwiftUI

struct FoodSearchComposerFlowPreview: View {
    enum Scenario {
        case barcodeDetail
        case barcodeCamera
        case mealCamera
        case context
        case contextExpanded
        case draftManager
        case empty
        case mixedReview
        case nativeSearch
        case oneItem
        case overflow
        case reviewLoading
        case threeItems
        case knownOnlyReview
    }

    let scenario: Scenario

    @State private var store = AppStore.preview

    init(scenario: Scenario = .empty) {
        self.scenario = scenario
    }

    var body: some View {
        MealComposerPrototypeShell(
            initialDraft: initialDraft,
            initialDrawerMode: initialDrawerMode,
            initialReviewPhase: initialReviewPhase,
            initialSearchQuery: initialSearchQuery,
            initialSheetDestination: initialSheetDestination,
            initialCameraDestination: initialCameraDestination,
            isContextExpanded: scenario == .contextExpanded,
            loggedAt: MealComposerPrototypeFixtures.loggedAt,
            usesCameraFixture: true
        ) {
            NavigationStack {
                List {
                    Section("Today") {
                        LabeledContent("Greek yogurt and berries", value: "280 cal")
                        LabeledContent("Chicken rice bowl", value: "520 cal")
                        LabeledContent("Protein shake", value: "190 cal")
                    }
                }
                .navigationTitle("Calories")
            }
        }
        .environment(store)
    }

    private var initialDraft: MealComposerDraft {
        switch scenario {
        case .context:
            MealComposerDraft(context: "Lunch after the gym", items: [])
        case .contextExpanded:
            MealComposerDraft(context: "A little extra sauce", items: MealComposerPrototypeFixtures.searchFoods.prefix(1).map { $0 })
        case .oneItem:
            MealComposerDraft(context: "", items: Array(MealComposerPrototypeFixtures.images.prefix(1)))
        case .threeItems, .reviewLoading:
            MealComposerPrototypeFixtures.threeItemDraft
        case .overflow, .draftManager, .mixedReview:
            MealComposerPrototypeFixtures.overflowDraft
        case .knownOnlyReview:
            MealComposerDraft(
                context: "",
                items: Array(MealComposerPrototypeFixtures.searchFoods.prefix(2))
            )
        case .barcodeCamera, .barcodeDetail, .empty, .mealCamera, .nativeSearch:
            MealComposerDraft(context: "", items: [])
        }
    }

    private var initialDrawerMode: MealComposerDrawerMode {
        switch scenario {
        case .draftManager:
            .draft
        case .mixedReview, .knownOnlyReview, .reviewLoading:
            .review
        case .barcodeCamera, .barcodeDetail, .context, .contextExpanded, .empty, .mealCamera,
             .nativeSearch, .oneItem, .overflow, .threeItems:
            .collapsed
        }
    }

    private var initialReviewPhase: MealComposerReview.Phase {
        switch scenario {
        case .mixedReview:
            .result
        case .reviewLoading:
            .calculating
        case .barcodeCamera, .barcodeDetail, .context, .contextExpanded, .draftManager, .empty,
             .knownOnlyReview, .mealCamera, .nativeSearch, .oneItem, .overflow, .threeItems:
            .ready
        }
    }

    private var initialSearchQuery: String {
        scenario == .nativeSearch ? "chicken" : ""
    }

    private var initialSheetDestination: MealComposerFoodSheetDestination? {
        switch scenario {
        case .nativeSearch:
            .search
        case .barcodeDetail:
            .food(MealComposerPrototypeFixtures.scannedFood(gtin: "00012345678905"))
        case .barcodeCamera, .context, .contextExpanded, .draftManager, .empty, .knownOnlyReview,
             .mealCamera, .mixedReview, .oneItem, .overflow, .reviewLoading, .threeItems:
            nil
        }
    }

    private var initialCameraDestination: MealComposerCameraDestination? {
        switch scenario {
        case .barcodeCamera:
            .barcode
        case .mealCamera:
            .meal
        case .barcodeDetail, .context, .contextExpanded, .draftManager, .empty, .knownOnlyReview,
             .mixedReview, .nativeSearch, .oneItem, .overflow, .reviewLoading, .threeItems:
            nil
        }
    }
}

#Preview("Empty composer") {
    FoodSearchComposerFlowPreview(scenario: .empty)
}

#Preview("Context chip") {
    FoodSearchComposerFlowPreview(scenario: .context)
}

#Preview("Expanded context") {
    FoodSearchComposerFlowPreview(scenario: .contextExpanded)
}

#Preview("One card with context badge") {
    FoodSearchComposerFlowPreview(scenario: .oneItem)
}

#Preview("Three-card deck") {
    FoodSearchComposerFlowPreview(scenario: .threeItems)
}

#Preview("Overflow deck") {
    FoodSearchComposerFlowPreview(scenario: .overflow)
}

#Preview("Native food search") {
    FoodSearchComposerFlowPreview(scenario: .nativeSearch)
}

#Preview("Barcode food detail") {
    FoodSearchComposerFlowPreview(scenario: .barcodeDetail)
}

#Preview("Meal camera card") {
    FoodSearchComposerFlowPreview(scenario: .mealCamera)
}

#Preview("Barcode camera card") {
    FoodSearchComposerFlowPreview(scenario: .barcodeCamera)
}

#Preview("Draft manager") {
    FoodSearchComposerFlowPreview(scenario: .draftManager)
}

#Preview("Mixed meal review") {
    FoodSearchComposerFlowPreview(scenario: .mixedReview)
}

#Preview("Known foods review") {
    FoodSearchComposerFlowPreview(scenario: .knownOnlyReview)
}

#Preview("AI loading") {
    FoodSearchComposerFlowPreview(scenario: .reviewLoading)
}
#endif
