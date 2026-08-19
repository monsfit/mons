import SwiftUI

struct ProfileConnectionUnavailableView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("Can't reach the API", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Try Again", systemImage: "arrow.clockwise", action: retry)
                .buttonStyle(MonsPrimaryButtonStyle())
                .frame(maxWidth: 220)
        }
        .padding(MonsSpacing.xLarge)
        .background(MonsColor.background.ignoresSafeArea())
    }
}
