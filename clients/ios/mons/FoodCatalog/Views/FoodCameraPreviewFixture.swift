#if os(iOS) && DEBUG
import SwiftUI

struct FoodCameraPreviewFixture: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.31, green: 0.58, blue: 0.68),
                    Color(red: 0.86, green: 0.73, blue: 0.48),
                    Color(red: 0.39, green: 0.22, blue: 0.14),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.white.opacity(0.18))
                .frame(width: 310, height: 390)
                .rotationEffect(.degrees(-7))

            Image(systemName: "fork.knife.circle.fill")
                .font(.system(size: 190, weight: .thin))
                .foregroundStyle(.white.opacity(0.72))
                .symbolRenderingMode(.hierarchical)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .accessibilityHidden(true)
    }
}
#endif
