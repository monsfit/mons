#if os(iOS)
import SwiftUI
import UIKit

struct FoodCameraControlsOverlay: View {
    @Binding var flashMode: UIImagePickerController.CameraFlashMode

    let onCancel: () -> Void
    let onCapture: () -> Void
    let onFlipCamera: () -> Void

    var body: some View {
        VStack {
            Spacer()

            GlassEffectContainer(spacing: MonsSpacing.xLarge) {
                HStack {
                    Button(action: onCancel) {
                        Image(systemName: "chevron.left")
                            .font(.body.bold())
                            .foregroundStyle(.white)
                            .frame(width: 54, height: 54)
                            .contentShape(Circle())
                    }
                        .buttonStyle(.plain)
                        .glassEffect(.regular.interactive(), in: .circle)
                        .accessibilityLabel("Close camera")

                    Spacer()

                    Button(action: onCapture) {
                        ZStack {
                            Circle()
                                .stroke(.white.opacity(0.95), lineWidth: 4)
                            Circle()
                                .fill(.white)
                                .padding(7)

                            Label("Take photo", systemImage: "camera")
                                .labelStyle(.iconOnly)
                                .hidden()
                        }
                    }
                        .frame(width: 78, height: 78)
                        .buttonStyle(.plain)
                        .accessibilityLabel("Take photo")

                    Spacer()

                    Menu {
                        Button("Flip Camera", systemImage: "camera.rotate", action: onFlipCamera)

                        Divider()

                        Picker("Flash", selection: $flashMode) {
                            Text("Auto").tag(UIImagePickerController.CameraFlashMode.auto)
                            Text("On").tag(UIImagePickerController.CameraFlashMode.on)
                            Text("Off").tag(UIImagePickerController.CameraFlashMode.off)
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.title3.bold())
                            .foregroundStyle(.white)
                            .frame(width: 54, height: 54)
                            .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.interactive(), in: .circle)
                    .accessibilityLabel("Camera options")
                }
            }
            .padding(.horizontal, MonsSpacing.large)
            .padding(.bottom, MonsSpacing.large)
        }
    }
}
#endif
