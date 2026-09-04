import SwiftUI

struct FoodServingEditor: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?

    let portions: [FoodPortion]
    let quantityGrams: Double

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.medium) {
            Text("Serving")
                .font(MonsTypography.sectionTitle)

            MonsCard {
                VStack(spacing: MonsSpacing.large) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Serving size")
                            .font(MonsTypography.headline)

                        Spacer()

                        VStack(alignment: .trailing, spacing: 0) {
                            Text(quantityGrams, format: .number.precision(.fractionLength(0...1)))
                                .font(MonsTypography.title)
                                .contentTransition(.numericText())
                            Text(selectedPortion?.unit == .serving ? "servings total" : "grams total")
                                .font(MonsTypography.caption)
                                .foregroundStyle(MonsColor.textSecondary)
                        }
                    }

                    FoodPortionMenu(
                        amount: $amount,
                        selectedPortion: $selectedPortion,
                        portions: portions
                    )

                    Divider()

                    HStack(spacing: MonsSpacing.medium) {
                        Button("Decrease servings", systemImage: "minus", action: decrease)
                            .labelStyle(.iconOnly)
                            .frame(minWidth: 44, minHeight: 44)
                            .buttonStyle(.glass)
                            .buttonBorderShape(.circle)
                            .disabled(amount <= 0.25)

                        Spacer(minLength: 0)

                        VStack(spacing: 0) {
                            TextField(
                                "Servings",
                                value: $amount,
                                format: .number.precision(.fractionLength(0...2))
                            )
                            .font(MonsTypography.title)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: 96)
                            #if os(iOS)
                            .keyboardType(.decimalPad)
                            #endif

                            Text(amount == 1 ? "serving" : "servings")
                                .font(MonsTypography.caption)
                                .foregroundStyle(MonsColor.textSecondary)
                        }

                        Spacer(minLength: 0)

                        Button("Increase servings", systemImage: "plus", action: increase)
                            .labelStyle(.iconOnly)
                            .frame(minWidth: 44, minHeight: 44)
                            .buttonStyle(.glass)
                            .buttonBorderShape(.circle)
                    }
                }
            }
        }
    }

    private func decrease() {
        amount = max(0.25, amount - 0.5)
    }

    private func increase() {
        amount = max(0.25, amount + 0.5)
    }
}
