import ClerkKitUI
import SwiftUI

struct SignedOutView: View {
    @Binding var authViewIsPresented: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
            Spacer()

            MonsWordmark()

            VStack(alignment: .leading, spacing: MonsSpacing.small) {
                Text("Nutrition and training, together.")
                    .font(MonsTypography.display)
                Text("Sign in to keep your food log, workouts, and progress securely synced.")
                    .font(MonsTypography.body)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            UserButton(signedOutContent: {
                Button("Continue") {
                    authViewIsPresented = true
                }
                .buttonStyle(MonsPrimaryButtonStyle())
            })
        }
        .padding(MonsSpacing.xLarge)
        .background(MonsColor.background.ignoresSafeArea())
    }
}
