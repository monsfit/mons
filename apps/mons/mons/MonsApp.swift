//
//  MonsApp.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

@main
struct MonsApp: App {
    @State private var store = AppStore()

    init() {
        MonsFontRegistrar.registerBundledFonts()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
                .environment(\.font, MonsTypography.body)
                .tint(MonsColor.action)
                .preferredColorScheme(.dark)
                .task {
                    await store.bootstrap()
                }
        }
    }
}
