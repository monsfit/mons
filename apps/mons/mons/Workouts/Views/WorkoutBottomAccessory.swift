import SwiftUI

struct WorkoutBottomAccessory: View {
    @Environment(\.tabViewBottomAccessoryPlacement) private var placement
    @Environment(WorkoutCoordinator.self) private var coordinator

    var body: some View {
        if let workout = coordinator.activeWorkout {
            ActiveWorkoutAccessory(
                isExpanded: placement == .expanded,
                workout: workout,
                onOpen: coordinator.presentActiveWorkout
            )
        } else if let template = coordinator.preparedTemplate {
            PreparedWorkoutAccessory(
                isExpanded: placement == .expanded,
                template: template,
                onStart: { coordinator.start() }
            )
        }
    }
}
