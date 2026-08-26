#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerBarcodeScannerFixture: View {
    let onDismiss: () -> Void
    let onScan: (String) -> Void

    var body: some View {
        ZStack {
            Color.black

            VStack(spacing: MonsSpacing.large) {
                Image(systemName: "barcode.viewfinder")
                    .font(.system(size: 88, weight: .thin))

                Text("Scan a barcode")
                    .font(.headline)

                Button("Use Demo Barcode", action: scanFixture)
                    .buttonStyle(.glassProminent)
            }
            .foregroundStyle(.white)
        }
        .overlay(alignment: .bottomLeading) {
            Button("Close scanner", systemImage: "chevron.left", action: onDismiss)
                .labelStyle(.iconOnly)
                .font(.body.bold())
                .foregroundStyle(.white)
                .frame(width: 54, height: 54)
                .buttonStyle(.plain)
                .glassEffect(.regular.interactive(), in: .circle)
                .padding(MonsSpacing.large)
        }
    }

    private func scanFixture() {
        onScan("012345678905")
    }
}
#endif
