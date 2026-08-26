import SwiftUI

struct MuscleMapFigureView: View {
    let regions: [MuscleRegionDefinition]
    @Binding var selectedRegion: MuscleRegionDefinition?

    private let panelColor = Color(red: 248 / 255, green: 250 / 255, blue: 251 / 255)
    private let panelBorderColor = Color(red: 229 / 255, green: 234 / 255, blue: 238 / 255)

    var body: some View {
        Color.clear
            .overlay {
                ZStack {
                    ForEach(regions) { region in
                        MuscleRegionButton(
                            region: region,
                            selectedRegion: $selectedRegion
                        )
                    }
                }
            }
            .aspectRatio(240 / 474, contentMode: .fit)
            .background(panelColor)
            .clipShape(.rect(cornerRadius: MonsRadius.large))
            .overlay {
                RoundedRectangle(cornerRadius: MonsRadius.large)
                    .stroke(panelBorderColor, lineWidth: 1)
            }
            .shadow(color: MonsColor.shadow, radius: MonsSpacing.medium, y: MonsSpacing.xSmall)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Selectable muscle regions")
    }
}
