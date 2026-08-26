#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchModeBar: View {
    @Binding var selection: MealComposerFoodSearchMode

    var body: some View {
        Picker("Food input mode", selection: $selection) {
            ForEach(MealComposerFoodSearchMode.allCases) { mode in
                Text(mode.title)
                    .tag(mode)
            }
        }
        .pickerStyle(.segmented)
        .controlSize(.large)
        .accessibilityLabel("Food input mode")
    }
}
#endif
