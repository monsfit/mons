#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerCardDeck: View {
    let items: [MealComposerDraftItem]
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            ZStack {
                if items.count > 3 {
                    itemCard(items[0], position: 0)
                    itemCard(items[1], position: 1)
                    overflowCard(position: 2)
                } else {
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        itemCard(item, position: index)
                    }
                }
            }
            .frame(width: 150, height: 82)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open meal draft with \(items.count) items")
    }

    private func itemCard(_ item: MealComposerDraftItem, position: Int) -> some View {
        MealComposerItemThumbnail(item: item, size: 58)
            .padding(4)
            .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
            .rotationEffect(rotation(for: position))
            .offset(offset(for: position))
            .zIndex(Double(position))
    }

    private func overflowCard(position: Int) -> some View {
        VStack(spacing: 1) {
            Text("…")
                .font(.title2.bold())

            Text("+\(items.count - 2)")
                .font(.caption.bold())
        }
        .foregroundStyle(.primary)
        .frame(width: 58, height: 58)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(4)
        .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
        .rotationEffect(rotation(for: position))
        .offset(offset(for: position))
        .zIndex(Double(position))
    }

    private func rotation(for position: Int) -> Angle {
        switch position {
        case 0: .degrees(-7)
        case 1: .degrees(1)
        default: .degrees(8)
        }
    }

    private func offset(for position: Int) -> CGSize {
        switch position {
        case 0: CGSize(width: -30, height: 6)
        case 1: CGSize(width: 0, height: 0)
        default: CGSize(width: 31, height: 6)
        }
    }
}
#endif
