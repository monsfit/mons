import SwiftUI

struct MuscleRegionButton: View {
    let region: MuscleRegionDefinition
    @Binding var selectedRegion: MuscleRegionDefinition?

    private let inactiveColor = Color(red: 217 / 255, green: 224 / 255, blue: 229 / 255)
    private let activeColor = Color(red: 239 / 255, green: 78 / 255, blue: 85 / 255)
    private let activeStrokeColor = Color(red: 184 / 255, green: 47 / 255, blue: 54 / 255)

    private var isSelected: Bool {
        selectedRegion?.id == region.id
    }

    var body: some View {
        let shape = MuscleRegionShape(commands: region.commands)

        Button(action: select) {
            shape
                .fill(isSelected ? activeColor : inactiveColor)
                .overlay {
                    shape.stroke(
                        isSelected ? activeStrokeColor : .white,
                        lineWidth: isSelected ? 1.25 : 0.6
                    )
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(.plain)
        .contentShape(.interaction, shape)
        .accessibilityLabel(region.displayName)
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint("Selects this muscle region")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func select() {
        selectedRegion = region
    }
}
