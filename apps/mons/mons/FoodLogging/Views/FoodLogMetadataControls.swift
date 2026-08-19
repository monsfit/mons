import SwiftUI

struct FoodLogMetadataControls: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?
    @Binding var loggedAt: Date
    @Binding var mealCategory: MealCategory

    let portions: [FoodPortion]
    let quantityGrams: Double

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
            FoodServingEditor(
                amount: $amount,
                selectedPortion: $selectedPortion,
                portions: portions,
                quantityGrams: quantityGrams
            )

            VStack(alignment: .leading, spacing: MonsSpacing.medium) {
                Text("When")
                    .font(MonsTypography.sectionTitle)

                MonsCard {
                    VStack(spacing: MonsSpacing.medium) {
                        Picker("Meal", selection: $mealCategory) {
                            ForEach(MealCategory.allCases) { category in
                                Label(category.title, systemImage: category.systemImage)
                                    .tag(category)
                            }
                        }

                        Divider()

                        DatePicker(
                            "Date",
                            selection: $loggedAt,
                            displayedComponents: .date
                        )

                        Divider()

                        DatePicker(
                            "Time",
                            selection: $loggedAt,
                            displayedComponents: .hourAndMinute
                        )
                    }
                }
            }
        }
    }
}
