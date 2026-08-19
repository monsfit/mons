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

    #if DEBUG
    @State private var tabBarPOCStore = AppStore.preview

    private var isTabBarPOCEnabled: Bool {
        ProcessInfo.processInfo.arguments.contains("-tabBarPOC")
            || ProcessInfo.processInfo.arguments.contains("-searchPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraAutoDismissPOC")
            || ProcessInfo.processInfo.arguments.contains("-recipesPOC")
    }

    private var previewTab: AppTab {
        if ProcessInfo.processInfo.arguments.contains("-searchPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraAutoDismissPOC") {
            .calories
        } else if ProcessInfo.processInfo.arguments.contains("-recipesPOC") {
            .recipes
        } else {
            .dashboard
        }
    }
    #endif

    init() {
        Clerk.configure(publishableKey: "pk_test_YmlnLWNvdy04Mi5jbGVyay5hY2NvdW50cy5kZXYk")
    }

    var body: some Scene {
        WindowGroup {
            Group {
                #if DEBUG
                if isTabBarPOCEnabled {
                    ContentView(initialSelection: previewTab)
                        .environment(tabBarPOCStore)
                } else {
                    AuthenticationGateView()
                }
                #else
                AuthenticationGateView()
                #endif
            }
                .tint(.blue)
                .prefetchClerkImages()
                .environment(Clerk.shared)
                .environment(store)
        }
    }
}
