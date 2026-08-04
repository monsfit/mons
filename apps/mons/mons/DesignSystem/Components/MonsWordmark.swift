import SwiftUI

struct MonsWordmark: View {
    var body: some View {
        ZStack {
            Text("mons")
                .foregroundStyle(MonsPalette.olive900)
                .offset(y: 6)

            Text("mons")
                .foregroundStyle(MonsPalette.ember500)
                .offset(y: 3)

            Text("mons")
                .foregroundStyle(MonsColor.textWarm)
        }
        .font(Font.custom("SpaceGrotesk-Bold", size: 38, relativeTo: .largeTitle))
        .tracking(2)
        .padding(.bottom, 6)
        .compositingGroup()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Mons")
    }
}
