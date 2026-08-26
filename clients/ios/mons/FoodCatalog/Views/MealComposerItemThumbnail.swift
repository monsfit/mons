#if DEBUG && os(iOS)
import SwiftUI
import UIKit

struct MealComposerItemThumbnail: View {
    let item: MealComposerDraftItem
    var size: CGFloat = 56

    var body: some View {
        thumbnail
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let imageData = item.imageData,
           let image = UIImage(data: imageData) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            ZStack {
                LinearGradient(
                    colors: colors,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                Image(systemName: item.systemImage)
                    .font(.system(size: size * 0.34, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.92))
            }
        }
    }

    private var colors: [Color] {
        switch item.palette {
        case .berry:
            [Color(red: 0.48, green: 0.22, blue: 0.48), Color(red: 0.92, green: 0.52, blue: 0.62)]
        case .grain:
            [Color(red: 0.88, green: 0.55, blue: 0.24), Color(red: 0.47, green: 0.25, blue: 0.12)]
        case .green:
            [Color(red: 0.21, green: 0.57, blue: 0.34), Color(red: 0.67, green: 0.78, blue: 0.34)]
        case .orange:
            [Color(red: 0.94, green: 0.43, blue: 0.20), Color(red: 0.96, green: 0.72, blue: 0.25)]
        case .photo:
            [Color(red: 0.22, green: 0.51, blue: 0.68), Color(red: 0.82, green: 0.66, blue: 0.39)]
        }
    }
}
#endif
