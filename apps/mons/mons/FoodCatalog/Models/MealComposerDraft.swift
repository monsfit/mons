#if DEBUG && os(iOS)
import Foundation

struct MealComposerDraft: Equatable {
    var context: String
    var items: [MealComposerDraftItem]

    var hasContent: Bool {
        !context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !items.isEmpty
    }

    var knownFoods: [MealComposerDraftItem] {
        items.filter { $0.kind == .food }
    }

    var images: [MealComposerDraftItem] {
        items.filter { $0.kind == .image }
    }

    var requiresAI: Bool {
        !context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !images.isEmpty
    }

    var exactCalories: Int {
        knownFoods.reduce(0) { $0 + $1.calories }
    }
}
#endif
