import PhotosUI
import SwiftUI
#if os(iOS)
import UIKit
#endif

struct CustomFoodEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var barcode: String
    @State private var brand = ""
    @State private var calories = 0.0
    @State private var carbohydrates = 0.0
    @State private var foodImageData: Data?
    @State private var foodPhoto: PhotosPickerItem?
    @State private var isSaving = false
    @State private var isShowingLabelCamera = false
    @State private var labelImageData: Data?
    @State private var labelPhoto: PhotosPickerItem?
    @State private var name = ""
    @State private var portionGrams = 100.0
    @State private var portionName = "100 gram serving"
    @State private var protein = 0.0
    @State private var totalFat = 0.0

    private let foodId: UUID

    init(food: CustomFood? = nil, barcode: String? = nil) {
        foodId = food?.foodId ?? UUID()
        _barcode = State(initialValue: food?.barcode ?? barcode ?? "")
        _brand = State(initialValue: food?.brand ?? "")
        _calories = State(initialValue: food?.calories ?? 0)
        _carbohydrates = State(initialValue: food?.carbohydrates ?? 0)
        _foodImageData = State(initialValue: food?.imageDataBase64)
        _labelImageData = State(initialValue: food?.nutritionLabelImageDataBase64)
        _name = State(initialValue: food?.name ?? "")
        _protein = State(initialValue: food?.protein ?? 0)
        _totalFat = State(initialValue: food?.totalFat ?? 0)
        if let portion = food?.portions.first {
            _portionGrams = State(initialValue: portion.amount)
            _portionName = State(initialValue: portion.name)
        }
    }

    var body: some View {
        Form {
            Section("Food") {
                TextField("Name", text: $name)
                TextField("Brand (optional)", text: $brand)
                TextField("GTIN-14 barcode (optional)", text: $barcode)
                    #if os(iOS)
                    .keyboardType(.numberPad)
                    #endif
            }

            Section("Nutrition per 100 g") {
                nutrientField("Calories", value: $calories, unit: "kcal")
                nutrientField("Protein", value: $protein, unit: "g")
                nutrientField("Fat", value: $totalFat, unit: "g")
                nutrientField("Carbohydrates", value: $carbohydrates, unit: "g")
            }

            Section("Default portion") {
                TextField("Portion name", text: $portionName)
                nutrientField("Weight", value: $portionGrams, unit: "g")
            }

            Section("Images") {
                photoPicker("Food photo", selection: $foodPhoto, hasImage: foodImageData != nil)
                photoPicker(
                    "Nutrition label",
                    selection: $labelPhoto,
                    hasImage: labelImageData != nil
                )
                #if os(iOS)
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button("Take label photo", systemImage: "camera") {
                        isShowingLabelCamera = true
                    }
                }
                #endif
                Text("The label photo is saved with this food. Automatic extraction will be added when model access is configured.")
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .monsGroupedContent()
        .navigationTitle("Custom Food")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel", action: dismiss.callAsFunction)
                    .disabled(isSaving)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button {
                    save()
                } label: {
                    MonsAsyncActionLabel(
                        title: "Save",
                        loadingTitle: "Saving…",
                        systemImage: "checkmark",
                        isLoading: isSaving
                    )
                }
                .disabled(!isValid || isSaving)
            }
        }
        .task(id: foodPhoto) {
            foodImageData = await normalizedData(from: foodPhoto) ?? foodImageData
        }
        .task(id: labelPhoto) {
            labelImageData = await normalizedData(from: labelPhoto) ?? labelImageData
        }
        .interactiveDismissDisabled(isSaving)
        #if os(iOS)
        .fullScreenCover(isPresented: $isShowingLabelCamera) {
            FoodCameraCaptureView(
                onCapture: { data in
                    labelImageData = FoodImageData.normalizedJPEG(data) ?? labelImageData
                    isShowingLabelCamera = false
                },
                onCancel: { isShowingLabelCamera = false }
            )
            .ignoresSafeArea()
        }
        #endif
    }

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && portionGrams > 0
            && normalizedBarcode != nil
    }

    private var normalizedBarcode: String? {
        let trimmed = barcode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }
        return BarcodeNormalizer.gtin14(trimmed)
    }

    private func nutrientField(_ title: String, value: Binding<Double>, unit: String) -> some View {
        LabeledContent(title) {
            HStack(spacing: MonsSpacing.xSmall) {
                TextField(title, value: value, format: .number.precision(.fractionLength(0...2)))
                    .multilineTextAlignment(.trailing)
                    #if os(iOS)
                    .keyboardType(.decimalPad)
                    #endif
                Text(unit)
                    .foregroundStyle(MonsColor.textSecondary)
            }
            .frame(maxWidth: 150)
        }
    }

    private func photoPicker(
        _ title: String,
        selection: Binding<PhotosPickerItem?>,
        hasImage: Bool
    ) -> some View {
        PhotosPicker(selection: selection, matching: .images) {
            Label(hasImage ? "Replace \(title.lowercased())" : title, systemImage: hasImage ? "checkmark.circle.fill" : "camera")
        }
    }

    private func normalizedData(from item: PhotosPickerItem?) async -> Data? {
        guard let data = try? await item?.loadTransferable(type: Data.self) else { return nil }
        return FoodImageData.normalizedJPEG(data)
    }

    private func save() {
        guard let normalizedBarcode else { return }
        isSaving = true
        Task {
            let saved = await store.meals.saveCustomFood(
                SaveCustomFoodRequest(
                    barcode: normalizedBarcode.isEmpty ? nil : normalizedBarcode,
                    brand: brand.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
                    calories: calories,
                    carbohydrates: carbohydrates,
                    foodId: foodId,
                    imageDataBase64: foodImageData,
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    nutritionLabelImageDataBase64: labelImageData,
                    portions: [FoodPortion(amount: portionGrams, name: portionName, unit: .grams)],
                    protein: protein,
                    totalFat: totalFat
                )
            )
            isSaving = false
            if saved != nil { dismiss() }
        }
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}

#Preview("Custom food") {
    NavigationStack {
        CustomFoodEditorView(barcode: "00012345678905")
    }
    .environment(AppStore.preview)
}
