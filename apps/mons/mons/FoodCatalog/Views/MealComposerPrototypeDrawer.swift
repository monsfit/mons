#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerPrototypeDrawer: View {
    let mode: MealComposerDrawerMode
    let draft: MealComposerDraft
    @Binding var reviewPhase: MealComposerReview.Phase
    let onDismiss: () -> Void
    let onBack: () -> Void
    let onEditItem: (MealComposerDraftItem) -> Void
    let onRemoveItem: (MealComposerDraftItem) -> Void
    let onReview: () -> Void
    let onStartCalculation: () -> Void
    let onCompleteCalculation: () -> Void
    let onDragChanged: (CGFloat) -> Void
    let onDragEnded: (CGFloat, CGFloat) -> Void

    var body: some View {
        VStack(spacing: 0) {
            dragHandle
            header
            content
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            Color(uiColor: .systemBackground).opacity(0.78),
            in: RoundedRectangle(cornerRadius: 28, style: .continuous)
        )
        .glassEffect(.regular, in: .rect(cornerRadius: 28))
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .accessibilityElement(children: .contain)
    }

    private var dragHandle: some View {
        Capsule()
            .fill(.secondary.opacity(0.34))
            .frame(width: 42, height: 5)
            .frame(maxWidth: .infinity)
            .frame(height: 24)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 10)
                    .onChanged { value in
                        onDragChanged(max(0, value.translation.height))
                    }
                    .onEnded { value in
                        onDragEnded(
                            max(0, value.translation.height),
                            max(0, value.predictedEndTranslation.height)
                        )
                    }
            )
            .accessibilityLabel("Drag down to close")
    }

    private var header: some View {
        HStack(spacing: MonsSpacing.medium) {
            if showsBackButton {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Back")
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.title3.weight(.semibold))

                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, MonsSpacing.large)
        .padding(.bottom, MonsSpacing.small)
    }

    @ViewBuilder
    private var content: some View {
        switch mode {
        case .collapsed:
            EmptyView()
        case .draft:
            MealComposerDraftManager(
                draft: draft,
                onEdit: onEditItem,
                onRemove: onRemoveItem,
                onReview: onReview
            )
        case .review:
            MealComposerReview(
                draft: draft,
                phase: reviewPhase,
                onStartCalculation: onStartCalculation,
                onCompleteCalculation: onCompleteCalculation
            )
        }
    }

    private var showsBackButton: Bool {
        switch mode {
        case .review:
            true
        case .collapsed, .draft:
            false
        }
    }

    private var title: String {
        switch mode {
        case .collapsed:
            ""
        case .draft:
            "Meal draft"
        case .review:
            "Review Meal"
        }
    }

    private var subtitle: String? {
        switch mode {
        case .draft:
            "\(draft.items.count) selected \(draft.items.count == 1 ? "item" : "items")"
        case .review:
            draft.requiresAI ? "Exact foods + AI inputs" : "Exact nutrition only"
        case .collapsed:
            nil
        }
    }
}
#endif
