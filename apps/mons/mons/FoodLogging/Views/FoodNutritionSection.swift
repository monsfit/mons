import SwiftUI

struct FoodNutritionSection: View {
    let group: FoodNutrientGroup
    let nutrients: [FoodNutrient]
    let targets: NutrientReferenceTargets

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.medium) {
            Text(group.title)
                .font(MonsTypography.sectionTitle)

            VStack(spacing: 0) {
                ForEach(nutrients) { nutrient in
                    FoodNutritionDetailRow(
                        nutrient: nutrient,
                        target: targets.target(for: nutrient)
                    )

                    if nutrient.id != nutrients.last?.id {
                        Divider()
                            .padding(.leading, MonsSpacing.large)
                    }
                }
            }
            .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
            .overlay {
                RoundedRectangle(cornerRadius: MonsRadius.medium)
                    .stroke(MonsColor.border, lineWidth: 1)
            }
        }
    }
}
