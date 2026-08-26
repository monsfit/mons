#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerContextControl: View {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

    @Binding var context: String
    @Binding var isExpanded: Bool

    @FocusState private var isFocused: Bool

    var body: some View {
        Group {
            if isExpanded {
                VStack(alignment: .leading, spacing: MonsSpacing.small) {
                    HStack {
                        Label("Meal context", systemImage: "text.bubble")
                            .font(.subheadline.bold())

                        Spacer()

                        Button("Done", systemImage: "checkmark", action: collapse)
                            .labelStyle(.iconOnly)
                            .buttonStyle(.glass)
                            .buttonBorderShape(.circle)
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityHint("Collapses the meal context field")
                    }

                    TextField("Add details for AI, like sauces or preparation", text: $context, axis: .vertical)
                        .focused($isFocused)
                        .lineLimit(2...4)
                        .submitLabel(.done)
                        .onSubmit(collapse)
                }
                .padding(.leading, MonsSpacing.large)
                .padding(.trailing, MonsSpacing.small)
                .padding(.vertical, MonsSpacing.small)
                .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 24))
                .accessibilityElement(children: .contain)
            } else {
                Button(
                    context.isEmpty ? "Add meal context" : "Edit meal context",
                    systemImage: context.isEmpty ? "text.bubble" : "text.bubble.fill",
                    action: expand
                )
                .labelStyle(.iconOnly)
                .font(.subheadline)
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .controlSize(.small)
                .frame(width: 44, height: 44)
                .accessibilityLabel(context.isEmpty ? "Add meal context" : "Edit meal context")
                .accessibilityValue(context)
            }
        }
        .onChange(of: isExpanded, focusWhenExpanded)
    }

    private func expand() {
        setExpanded(true)
    }

    private func collapse() {
        isFocused = false
        setExpanded(false)
    }

    private func focusWhenExpanded(_ oldValue: Bool, _ newValue: Bool) {
        guard newValue else {
            isFocused = false
            return
        }
        Task { @MainActor in
            await Task.yield()
            isFocused = true
        }
    }

    private func setExpanded(_ expanded: Bool) {
        if accessibilityReduceMotion {
            isExpanded = expanded
        } else {
            withAnimation(.smooth(duration: 0.28, extraBounce: 0.02)) {
                isExpanded = expanded
            }
        }
    }
}
#endif
