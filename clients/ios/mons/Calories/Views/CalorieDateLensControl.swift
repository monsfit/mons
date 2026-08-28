import SwiftUI

struct CalorieDateLensControl: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let title: String
    let displayedDate: Date
    let scrubStep: Int
    let offset: Double
    let presentCalendar: () -> Void
    let updateScrub: (DragGesture.Value) -> Void
    let finishScrub: (DragGesture.Value) -> Void
    let adjustDate: (AccessibilityAdjustmentDirection) -> Void

    private var titleTransition: ContentTransition {
        reduceMotion ? .opacity : .numericText(countsDown: scrubStep < 0)
    }

    private var interactionGesture: some Gesture {
        DragGesture(minimumDistance: 8)
            .onChanged(updateScrub)
            .onEnded(finishScrub)
            .exclusively(
                before: TapGesture()
                    .onEnded(presentCalendar)
            )
    }

    var body: some View {
        Label(title, systemImage: "calendar")
            .font(.headline)
            .foregroundStyle(.primary)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .contentTransition(titleTransition)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: 50)
            .glassEffect(.regular.interactive(), in: .capsule)
            .offset(x: offset)
            .contentShape(.capsule)
            .gesture(interactionGesture)
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel("Selected date")
            .accessibilityValue(displayedDate.formatted(date: .complete, time: .omitted))
            .accessibilityHint("Double-tap to open the calendar. Swipe up or down to change days.")
            .accessibilityInputLabels(["Date", "Calendar"])
            .accessibilityAction(.default, presentCalendar)
            .accessibilityAdjustableAction(adjustDate)
    }
}
