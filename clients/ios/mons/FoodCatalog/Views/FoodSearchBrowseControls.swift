import SwiftUI

struct FoodSearchBrowseControls: View {
    @Binding var selectedScope: FoodSearchScope

    let quickActions: [FoodSearchQuickAction]
    let scopes: [FoodSearchScope]
    let onQuickAction: (FoodSearchQuickAction) -> Void

    init(
        selectedScope: Binding<FoodSearchScope>,
        quickActions: [FoodSearchQuickAction] = FoodSearchQuickAction.allCases,
        scopes: [FoodSearchScope] = FoodSearchScope.allCases,
        onQuickAction: @escaping (FoodSearchQuickAction) -> Void
    ) {
        _selectedScope = selectedScope
        self.quickActions = quickActions
        self.scopes = scopes
        self.onQuickAction = onQuickAction
    }

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: MonsSpacing.small),
        count: 4
    )

    var body: some View {
        VStack(spacing: MonsSpacing.large) {
            ScrollView(.horizontal) {
                HStack(spacing: MonsSpacing.xLarge) {
                    ForEach(scopes) { scope in
                        Button(scope.title) {
                            selectedScope = scope
                        }
                        .buttonStyle(.plain)
                        .font(MonsTypography.caption)
                        .foregroundStyle(
                            selectedScope == scope
                                ? MonsColor.textPrimary
                                : MonsColor.textSecondary
                        )
                        .frame(minHeight: 44)
                        .overlay(alignment: .bottom) {
                            if selectedScope == scope {
                                Capsule()
                                    .fill(MonsColor.action)
                                    .frame(height: 2)
                            }
                        }
                        .accessibilityAddTraits(selectedScope == scope ? .isSelected : [])
                    }
                }
            }
            .scrollIndicators(.hidden)

            if !quickActions.isEmpty {
                LazyVGrid(columns: columns, spacing: MonsSpacing.small) {
                    ForEach(quickActions) { action in
                        Button {
                            onQuickAction(action)
                        } label: {
                            VStack(spacing: MonsSpacing.small) {
                                Image(systemName: action.systemImage)
                                    .font(MonsTypography.sectionTitle)
                                    .accessibilityHidden(true)

                                Text(action.title)
                                    .font(MonsTypography.caption)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)
                            }
                            .foregroundStyle(
                                action.isAvailable ? MonsColor.action : MonsColor.textMuted
                            )
                            .frame(maxWidth: .infinity, minHeight: 72)
                            .padding(.horizontal, MonsSpacing.xSmall)
                            .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.small))
                            .overlay {
                                RoundedRectangle(cornerRadius: MonsRadius.small)
                                    .stroke(MonsColor.border, lineWidth: 1)
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(!action.isAvailable)
                        .accessibilityValue(action.isAvailable ? "Available" : "Coming soon")
                    }
                }
            }
        }
    }
}

#Preview("Food search browse controls") {
    @Previewable @State var selectedScope = FoodSearchScope.all

    FoodSearchBrowseControls(selectedScope: $selectedScope, onQuickAction: { _ in })
        .padding()
        .background(MonsColor.background)
}
