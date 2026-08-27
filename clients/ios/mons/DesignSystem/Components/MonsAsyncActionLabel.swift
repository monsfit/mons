import SwiftUI

struct MonsAsyncActionLabel: View {
    let title: String
    let loadingTitle: String
    let systemImage: String
    let isLoading: Bool

    var body: some View {
        if isLoading {
            HStack(spacing: MonsSpacing.small) {
                ProgressView()
                    .controlSize(.small)
                Text(loadingTitle)
            }
            .accessibilityElement(children: .combine)
        } else {
            Label(title, systemImage: systemImage)
        }
    }
}
