import SwiftUI

struct DashboardMacroMetric: View {
    let color: Color
    let consumed: Int
    let target: Int
    let title: String

    private var progress: Double {
        guard target > 0 else { return 0 }
        return min(max(Double(consumed) / Double(target), 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ProgressView(value: progress)
                .tint(color)
            Text("\(consumed.formatted()) / \(target.formatted()) g")
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
