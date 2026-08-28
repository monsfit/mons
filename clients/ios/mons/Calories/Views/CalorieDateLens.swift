import SwiftUI

struct CalorieDateLens: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let maximumDate: Date
    let calendar: Calendar

    @Binding var selectedDate: Date
    @State private var isCalendarPresented = false
    @State private var scrubOriginDate: Date?
    @State private var previewDate: Date?
    @State private var scrubStep = 0
    @State private var lensOffset = 0.0
    @State private var hapticTrigger = 0

    private var displayedDate: Date {
        previewDate ?? selectedDate
    }

    private var previousDate: Date {
        CalorieDateScrubber.date(
            from: displayedDate,
            dayOffset: -1,
            maximumDate: maximumDate,
            calendar: calendar
        )
    }

    private var nextDate: Date? {
        let proposedDate = CalorieDateScrubber.date(
            from: displayedDate,
            dayOffset: 1,
            maximumDate: maximumDate,
            calendar: calendar
        )
        return calendar.isDate(proposedDate, inSameDayAs: displayedDate) ? nil : proposedDate
    }

    private var lensTitle: String {
        let monthAndDay = displayedDate.formatted(.dateTime.month(.abbreviated).day())
        if calendar.isDate(displayedDate, inSameDayAs: maximumDate) {
            return "Today · \(monthAndDay)"
        }

        if calendar.component(.year, from: displayedDate) == calendar.component(.year, from: maximumDate) {
            return displayedDate.formatted(
                .dateTime.weekday(.abbreviated).month(.abbreviated).day()
            )
        }

        return displayedDate.formatted(
            .dateTime.weekday(.abbreviated).month(.abbreviated).day().year()
        )
    }

    private var valueAnimation: Animation? {
        reduceMotion ? .linear(duration: 0.12) : .smooth(duration: 0.18)
    }

    init(
        selectedDate: Binding<Date>,
        maximumDate: Date,
        calendar: Calendar
    ) {
        _selectedDate = selectedDate
        self.maximumDate = maximumDate
        self.calendar = calendar
    }

    var body: some View {
        HStack(spacing: 8) {
            CalorieDateEdgeButton(
                date: previousDate,
                isHidden: false,
                isCollapsed: dynamicTypeSize.isAccessibilitySize,
                action: selectPreviousDate
            )

            CalorieDateLensControl(
                title: lensTitle,
                displayedDate: displayedDate,
                scrubStep: scrubStep,
                offset: lensOffset,
                presentCalendar: presentCalendar,
                updateScrub: updateScrub,
                finishScrub: finishScrub,
                adjustDate: adjustDate
            )

            CalorieDateEdgeButton(
                date: nextDate ?? displayedDate,
                isHidden: nextDate == nil,
                isCollapsed: dynamicTypeSize.isAccessibilitySize,
                action: selectNextDate
            )
        }
        .frame(maxWidth: .infinity)
        .animation(valueAnimation, value: displayedDate)
#if os(iOS)
        .sensoryFeedback(.selection, trigger: hapticTrigger)
#endif
        .sheet(isPresented: $isCalendarPresented) {
            CalorieDatePicker(
                selectedDate: $selectedDate,
                maximumDate: maximumDate,
                calendar: calendar
            )
        }
    }

    private func presentCalendar() {
        guard scrubOriginDate == nil else { return }
        isCalendarPresented = true
    }

    private func selectPreviousDate() {
        commit(previousDate)
    }

    private func selectNextDate() {
        guard let nextDate else { return }
        commit(nextDate)
    }

    private func updateScrub(_ value: DragGesture.Value) {
        let originDate = scrubOriginDate ?? calendar.startOfDay(for: selectedDate)
        if scrubOriginDate == nil {
            scrubOriginDate = originDate
        }

        let rawStep = CalorieDateScrubber.dayOffset(for: Double(value.translation.width))
        let proposedDate = CalorieDateScrubber.date(
            from: originDate,
            dayOffset: rawStep,
            maximumDate: maximumDate,
            calendar: calendar
        )
        let clampedStep = calendar.dateComponents(
            [.day],
            from: originDate,
            to: proposedDate
        ).day ?? 0

        if clampedStep != scrubStep {
            scrubStep = clampedStep
            previewDate = proposedDate
            hapticTrigger += 1
        }

        lensOffset = reduceMotion
            ? 0
            : min(max(Double(value.translation.width) * 0.12, -18), 18)
    }

    private func finishScrub(_: DragGesture.Value) {
        let destination = previewDate

        withAnimation(reduceMotion ? nil : .smooth(duration: 0.24)) {
            lensOffset = 0
            if let destination {
                selectedDate = destination
            }
        }

        scrubOriginDate = nil
        previewDate = nil
        scrubStep = 0
    }

    private func commit(_ date: Date) {
        hapticTrigger += 1
        withAnimation(reduceMotion ? nil : .smooth(duration: 0.24)) {
            selectedDate = calendar.startOfDay(for: date)
        }
    }

    private func adjustDate(_ direction: AccessibilityAdjustmentDirection) {
        switch direction {
        case .increment:
            selectNextDate()
        case .decrement:
            selectPreviousDate()
        @unknown default:
            break
        }
    }
}

#Preview("Date lens") {
    @Previewable @State var selectedDate = CalorieSampleData.previewReferenceDate

    CalorieDateLens(
        selectedDate: $selectedDate,
        maximumDate: CalorieSampleData.previewReferenceDate,
        calendar: .current
    )
    .padding()
}
