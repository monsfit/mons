#if os(iOS)
import SwiftUI

struct FoodSearchComposerMenuItem: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label {
            Text(title)
                .font(.title3)
        } icon: {
            Image(systemName: systemImage)
                .font(.title3)
                .frame(width: 52, height: 52)
                .background(.secondary.opacity(0.12), in: .circle)
        }
        .frame(maxWidth: .infinity, minHeight: 68, alignment: .leading)
        .contentShape(.rect)
    }
}
#endif
