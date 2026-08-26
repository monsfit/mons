#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerSelectionShelf: View {
    let items: [MealComposerDraftItem]
    @Binding var context: String
    @Binding var isContextExpanded: Bool
    let onOpenDraft: () -> Void

    private var contextBadgeOffset: CGSize {
        switch items.count {
        case 1:
            CGSize(width: 4, height: -27)
        case 2:
            CGSize(width: 33, height: -33)
        default:
            CGSize(width: 64, height: -27)
        }
    }

    var body: some View {
        Group {
            if isContextExpanded {
                MealComposerContextControl(
                    context: $context,
                    isExpanded: $isContextExpanded
                )
            } else {
                if items.isEmpty {
                    MealComposerContextControl(
                        context: $context,
                        isExpanded: $isContextExpanded
                    )
                    .offset(x: 12, y: 14)
                } else {
                    ZStack {
                        MealComposerCardDeck(items: items, onOpen: onOpenDraft)

                        MealComposerContextControl(
                            context: $context,
                            isExpanded: $isContextExpanded
                        )
                        .offset(contextBadgeOffset)
                        .zIndex(10)
                    }
                    .frame(width: 150, height: 82)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
#endif
