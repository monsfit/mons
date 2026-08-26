import SwiftUI

struct MuscleMapControls: View {
    @Binding var bodyType: MuscleMapBody
    @Binding var side: MuscleMapSide

    var body: some View {
        VStack(spacing: MonsSpacing.medium) {
            Picker("Body", selection: $bodyType) {
                ForEach(MuscleMapBody.allCases) { body in
                    Text(body.title).tag(body)
                }
            }
            .pickerStyle(.segmented)

            Picker("View", selection: $side) {
                ForEach(MuscleMapSide.allCases) { side in
                    Text(side.title).tag(side)
                }
            }
            .pickerStyle(.segmented)
        }
        .frame(maxWidth: 420)
    }
}
