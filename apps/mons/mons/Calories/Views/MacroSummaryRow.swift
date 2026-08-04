import SwiftUI

struct MacroSummaryRow: View {
    let macros: MacroTotals

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack {
                MacroMetricView(title: "Protein", grams: macros.protein)
                Spacer()
                MacroMetricView(title: "Carbs", grams: macros.carbohydrates)
                Spacer()
                MacroMetricView(title: "Fat", grams: macros.fat)
            }

            VStack(alignment: .leading) {
                MacroMetricView(title: "Protein", grams: macros.protein)
                MacroMetricView(title: "Carbs", grams: macros.carbohydrates)
                MacroMetricView(title: "Fat", grams: macros.fat)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
