#if os(iOS)
import PhotosUI
import SwiftUI

struct FoodSearchComposerMenu: View {
    @Binding var selectedPhoto: PhotosPickerItem?

    let onBarcode: () -> Void
    let onCamera: () -> Void
    let onPaste: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onBarcode) {
                FoodSearchComposerMenuItem(title: "Scan Barcode", systemImage: "barcode.viewfinder")
            }

            Button(action: onCamera) {
                FoodSearchComposerMenuItem(title: "Camera", systemImage: "camera")
            }

            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                FoodSearchComposerMenuItem(title: "Photos", systemImage: "photo.on.rectangle")
            }

            Button(action: onPaste) {
                FoodSearchComposerMenuItem(title: "Paste", systemImage: "doc.on.clipboard")
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
    }
}
#endif
