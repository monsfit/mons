import SwiftUI

struct MonsWordmark: View {
    var body: some View {
        Text("mons")
            .font(Font.custom("SpaceGrotesk-Bold", size: 38, relativeTo: .largeTitle))
            .tracking(2)
            .foregroundStyle(MonsColor.textWarm)
            .accessibilityLabel("Mons")
    }
}
