//
//  MonsApp.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import ClerkKit
import ClerkKitUI
import SwiftUI

@main
struct MonsApp: App {
    @State private var store = AppStore()

    init() {
        MonsFontRegistrar.registerBundledFonts()
        Clerk.configure(publishableKey: "pk_test_YmlnLWNvdy04Mi5jbGVyay5hY2NvdW50cy5kZXYk")
    }

    var body: some Scene {
        WindowGroup {
            AuthenticationGateView()
                .prefetchClerkImages()
                .environment(Clerk.shared)
                .environment(store)
                .environment(\.font, MonsTypography.body)
                .tint(MonsColor.action)
        }
    }
}
