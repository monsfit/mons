import ClerkKit
import ClerkKitUI
import SwiftUI

struct AuthenticationGateView: View {
    @Environment(Clerk.self) private var clerk
    @Environment(AppStore.self) private var store

    @State private var authViewIsPresented = false

    var body: some View {
        Group {
            if !clerk.isLoaded {
                ZStack {
                    MonsColor.background.ignoresSafeArea()
                    ProgressView("Loading account")
                        .font(MonsTypography.body)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            } else if clerk.user == nil {
                SignedOutView(authViewIsPresented: $authViewIsPresented)
            } else {
                ContentView()
            }
        }
        .sheet(isPresented: $authViewIsPresented) {
            AuthView()
        }
        .onOpenURL { url in
            Task {
                try? await clerk.handle(url)
            }
        }
        .onChange(of: clerk.session?.tasks, initial: true) { _, tasks in
            if tasks?.isEmpty == false {
                authViewIsPresented = true
            }
        }
        .task {
            for await event in clerk.auth.events {
                switch event {
                case .signInNeedsContinuation, .signUpNeedsContinuation:
                    authViewIsPresented = true
                default:
                    break
                }
            }
        }
        .task(id: clerk.user?.id) {
            store.resetForAuthenticationChange()
            guard clerk.user != nil else { return }
            await store.bootstrap()
        }
    }
}
