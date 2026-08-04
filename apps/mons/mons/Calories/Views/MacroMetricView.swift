import SwiftUI

struct MacroMetricView: View {
    let title: String
    let grams: Int

    var body: some View {
        VStack(alignment: .leading) {
            Text(title)
                .foregroundStyle(.secondary)
            Text("\(grams.formatted()) g")
                .font(.headline)
        }
    }
}
