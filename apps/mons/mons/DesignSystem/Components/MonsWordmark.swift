import SwiftUI

struct MonsWordmark: View {
    var body: some View {
        ZStack {
            Text("mons")
                .foregroundStyle(MonsColor.action.opacity(0.45))
                .offset(y: 3)

            Text("mons")
                .foregroundStyle(MonsColor.textPrimary)
        }
        .font(Font.custom("SpaceGrotesk-Bold", size: 38, relativeTo: .largeTitle))
        .tracking(2)
        .padding(.bottom, 3)
        .compositingGroup()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Mons")
    }
}
