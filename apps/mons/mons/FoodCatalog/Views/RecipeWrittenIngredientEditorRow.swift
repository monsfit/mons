import SwiftUI

struct RecipeWrittenIngredientEditorRow: View {
    @Binding var ingredient: FreeformIngredientDraft

    let onRemove: () -> Void

    private var normalizedPreview: String? {
        let original = ingredient.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !original.isEmpty,
              let parsed = ingredient.parsedIngredient,
              parsed.quantity != nil,
              parsed.unit != nil else {
            return nil
        }
        let normalized = parsed.scaledDescription(multiplier: 1)
        return normalized.localizedCaseInsensitiveCompare(original) == .orderedSame ? nil : normalized
    }

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
            HStack(spacing: MonsSpacing.small) {
                TextField("e.g. 2 tbsp garlic", text: $ingredient.text)

                Button("Remove ingredient", systemImage: "trash", role: .destructive, action: onRemove)
                    .labelStyle(.iconOnly)
                    .foregroundStyle(MonsColor.error)
                    .frame(width: 44, height: 44)
                    .buttonStyle(.plain)
            }

            if let normalizedPreview {
                Text("Parsed as \(normalizedPreview)")
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
    }
}

#Preview("Written ingredient editor row") {
    Form {
        RecipeWrittenIngredientEditorRow(
            ingredient: .constant(
                FreeformIngredientDraft(id: UUID(), text: "2 tablespoons garlic")
            ),
            onRemove: {}
        )
    }
    .scrollContentBackground(.hidden)
    .background(MonsColor.background)
}
