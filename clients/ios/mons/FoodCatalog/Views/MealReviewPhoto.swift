import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

struct MealReviewPhoto: View {
    let data: Data

    var body: some View {
        Group {
            #if canImport(UIKit)
            if let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                placeholder
            }
            #else
            placeholder
            #endif
        }
        .frame(maxWidth: .infinity)
        .frame(height: 260)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .accessibilityLabel("Meal photo")
    }

    private var placeholder: some View {
        Rectangle()
            .fill(MonsColor.surfaceRaised)
            .overlay { Image(systemName: "photo") }
    }
}
