import Foundation

enum WorkoutSampleData {
    static func sessions(referenceDate: Date, calendar: Calendar) -> [WorkoutSession] {
        let today = calendar.startOfDay(for: referenceDate)

        return [
            WorkoutSession(
                id: "upper-body",
                title: "Upper Body Strength",
                completedAt: date(dayOffset: 0, hour: 7, minute: 15, today: today, calendar: calendar),
                durationMinutes: 54,
                metric: .strength(exercises: 6, sets: 22),
                sets: [
                    set("upper-bench", "Bench press", "4 sets × 8 reps", "135 lb"),
                    set("upper-row", "Barbell row", "4 sets × 10 reps", "115 lb"),
                    set("upper-press", "Shoulder press", "3 sets × 10 reps", "70 lb"),
                    set("upper-pull", "Pull-ups", "3 sets × 8 reps", "Bodyweight")
                ]
            ),
            WorkoutSession(
                id: "easy-run",
                title: "Easy Run",
                completedAt: date(dayOffset: -1, hour: 18, minute: 10, today: today, calendar: calendar),
                durationMinutes: 31,
                metric: .cardio(distanceKilometers: 5.2),
                sets: [
                    set("easy-warmup", "Warm up", "Easy pace", "5 min"),
                    set("easy-run", "Steady run", "Zone 2", "22 min"),
                    set("easy-cooldown", "Cool down", "Walk", "4 min")
                ]
            ),
            WorkoutSession(
                id: "lower-body",
                title: "Lower Body Strength",
                completedAt: date(dayOffset: -3, hour: 7, minute: 5, today: today, calendar: calendar),
                durationMinutes: 62,
                metric: .strength(exercises: 7, sets: 25),
                sets: [
                    set("lower-squat", "Back squat", "5 sets × 5 reps", "185 lb"),
                    set("lower-rdl", "Romanian deadlift", "4 sets × 8 reps", "155 lb"),
                    set("lower-lunge", "Walking lunge", "3 sets × 12 reps", "40 lb")
                ]
            ),
            WorkoutSession(
                id: "tempo-run",
                title: "Tempo Run",
                completedAt: date(dayOffset: -6, hour: 17, minute: 45, today: today, calendar: calendar),
                durationMinutes: 46,
                metric: .cardio(distanceKilometers: 8.4),
                sets: [
                    set("tempo-warmup", "Warm up", "Easy pace", "10 min"),
                    set("tempo-effort", "Tempo effort", "Threshold pace", "28 min"),
                    set("tempo-cooldown", "Cool down", "Easy pace", "8 min")
                ]
            ),
            WorkoutSession(
                id: "full-body",
                title: "Full Body Strength",
                completedAt: date(dayOffset: -10, hour: 8, minute: 0, today: today, calendar: calendar),
                durationMinutes: 58,
                metric: .strength(exercises: 8, sets: 27),
                sets: [
                    set("full-deadlift", "Deadlift", "4 sets × 5 reps", "225 lb"),
                    set("full-pushup", "Push-ups", "4 sets × 15 reps", "Bodyweight"),
                    set("full-goblet", "Goblet squat", "4 sets × 10 reps", "60 lb")
                ]
            )
        ]
    }

    private static func date(
        dayOffset: Int,
        hour: Int,
        minute: Int,
        today: Date,
        calendar: Calendar
    ) -> Date {
        let day = calendar.date(byAdding: .day, value: dayOffset, to: today) ?? today
        return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day) ?? day
    }

    private static func set(_ id: String, _ title: String, _ detail: String, _ value: String) -> WorkoutSet {
        WorkoutSet(id: id, title: title, detail: detail, value: value)
    }
}
