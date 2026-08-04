import SwiftUI

struct WeightEntrySheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var isSaving = false
    @State private var measuredAt: Date
    @State private var system: MeasurementSystem
    @State private var weightValue: Double

    let onSave: (Double, Date) async -> Bool

    init(
        initialWeightKg: Double,
        measuredAt: Date = .now,
        system: MeasurementSystem = .preferred,
        onSave: @escaping (Double, Date) async -> Bool
    ) {
        self.onSave = onSave
        _measuredAt = State(initialValue: measuredAt)
        _system = State(initialValue: system)
        _weightValue = State(initialValue: system.displayedWeight(kilograms: initialWeightKg))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Measurement") {
                    Picker("Units", selection: $system) {
                        Text("Pounds").tag(MeasurementSystem.imperial)
                        Text("Kilograms").tag(MeasurementSystem.metric)
                    }
                    .pickerStyle(.segmented)

                    LabeledContent("Weight") {
                        TextField("Weight", value: $weightValue, format: .number.precision(.fractionLength(1)))
                            .multilineTextAlignment(.trailing)
                            #if os(iOS)
                            .keyboardType(.decimalPad)
                            #endif
                    }

                    DatePicker("Measured", selection: $measuredAt, in: ...Date.now)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MonsColor.background)
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Log Weight")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .onChange(of: system, convertWeight)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                        .tint(MonsColor.error)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(!isValid || isSaving)
                }
            }
        }
        .tint(MonsColor.action)
        .presentationDetents([.medium])
    }

    private var weightKg: Double {
        system.kilograms(displayedWeight: weightValue)
    }

    private var isValid: Bool {
        (30...350).contains(weightKg)
    }

    private func convertWeight(oldValue: MeasurementSystem, newValue: MeasurementSystem) {
        let kilograms = oldValue.kilograms(displayedWeight: weightValue)
        weightValue = newValue.displayedWeight(kilograms: kilograms)
    }

    private func save() {
        isSaving = true
        Task {
            let saved = await onSave(weightKg, measuredAt)
            isSaving = false
            if saved {
                dismiss()
            }
        }
    }
}
