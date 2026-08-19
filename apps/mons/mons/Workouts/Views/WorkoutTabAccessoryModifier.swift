import SwiftUI

struct WorkoutTabAccessoryModifier: ViewModifier {
    @Environment(WorkoutCoordinator.self) private var coordinator

    func body(content: Content) -> some View {
        @Bindable var coordinator = coordinator

        #if os(iOS)
        content
            .tabViewBottomAccessory(
                isEnabled: coordinator.activeWorkout != nil || coordinator.preparedTemplate != nil
            ) {
                WorkoutBottomAccessory()
            }
            .tabBarMinimizeBehavior(.onScrollDown)
            .sheet(isPresented: $coordinator.isPresentingActiveWorkout) {
                ActiveWorkoutPresentation()
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        #else
        content
            .sheet(isPresented: $coordinator.isPresentingActiveWorkout) {
                ActiveWorkoutPresentation()
            }
        #endif
    }
}

private struct ActiveWorkoutPresentation: View {
    @Environment(WorkoutCoordinator.self) private var coordinator

    var body: some View {
        if let workout = coordinator.activeWorkout {
            NavigationStack {
                ActiveWorkoutLoggingView(
                    title: workout.title,
                    initialExercises: workout.exercises,
                    sessionId: workout.sessionId,
                    startedAt: workout.startedAt,
                    onExercisesChanged: coordinator.updateExercises,
                    onSaved: coordinator.finish
                )
            }
        }
    }
}
