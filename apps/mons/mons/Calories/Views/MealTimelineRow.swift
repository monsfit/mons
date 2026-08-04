import SwiftUI

struct MealTimelineRow: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let meal: MealEvent
    let onMove: (MealEvent, Int) -> Void

    var body: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: MonsSpacing.small) {
                    MealTimelineTimeLabel(date: meal.loggedAt)
                    MealTimelineCardControl(meal: meal, onMove: onMove)
                }
            } else {
                HStack(alignment: .center, spacing: MonsSpacing.medium) {
                    MealTimelineTimeLabel(date: meal.loggedAt)
                        .frame(width: 76, alignment: .trailing)
                    MealTimelineCardControl(meal: meal, onMove: onMove)
                        .layoutPriority(1)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
