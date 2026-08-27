# Mons

Mons is the SwiftUI client application.

Authentication uses ClerkKit and ClerkKitUI's prebuilt `AuthView` and `UserButton`. Clerk is
configured with the development publishable key, while the API secret remains only in the ignored
root `.env`. API requests obtain the current Clerk session token and send it as a bearer token.
Sign-out clears account-scoped in-memory state before another profile can load.
The linked Clerk instance exposes Apple and Google as its sign-in strategies, so both appear in the
prebuilt native authentication view. Sign in with Apple is declared in the app entitlements;
Google is handled through Clerk's OAuth callback flow.

It connects to the Mons API for:

- adult onboarding that estimates TDEE and a weight-goal calorie target;
- a dashboard for today's nutrition, weekly workouts, and weight trend;
- native labeled tabs with a dedicated Search role, bottom search field, and top add menu;
- separate Common, Branded, and Recently Added food sections with compact nutrition summaries;
- searchable My Foods and My Recipes libraries; custom foods support manual nutrition, optional
  barcodes, food photos, and nutrition-label capture;
- measured-yield recipe portions so a cooked batch or bowl weight scales nutrition deterministically,
  plus freeform recipes that remain visibly pending until model estimation is configured;
- camera barcode scanning with normalized UPC/EAN/GTIN lookup;
- reviewed meal estimation from a photo, typed description, or voice recording; models identify the
  meal, but only matched catalog records supply calories and macros;
- written recipe ingredients can be matched through the same catalog resolver, then remain editable
  as ordinary food ingredients and gram amounts before the recipe is saved;
- quantity-scaled full nutrient details, daily-target progress, logging, and day summaries;
- exercise search, expandable exercise/set template editing, active set logging, rest timing,
  persistent reusable templates, and completed workouts;
- canonical weight tracking with pound and kilogram entry.

Open `mons.xcodeproj` in Xcode, or build and test it from the repository root:

```bash
npx pnpm@11.20.0 mons:check
```

`mons:check` first builds and tests the local Swift packages, then treats app warnings as errors,
enables complete strict-concurrency checking, builds the iOS Simulator target, and runs the app's
deterministic test suite. Project-local iOS review skills are checked into `.agents/skills`; their
pinned provenance and update policy are documented in `.agents/skills/README.md`.

## Feature modules and previews

UI features live in local Swift packages declared by `Package.swift`. A feature package owns its
presentation state, views, deterministic fixtures, previews, and focused tests. The application
target remains a thin composition layer: it translates domain models into presentation values and
injects account controls, navigation callbacks, persistence, and networking.

The dashboard is the first extracted vertical slice:

- `MonsDesignSystem` owns shared tokens, components, and bundled Space Grotesk resources;
- `MonsDashboardFeature` owns the dashboard presentation UI and has no Clerk, API, or `AppStore`
  dependency;
- `DashboardView` in the app is the live-state adapter;
- package previews cover populated and empty states with fixed dates and values.

For fast UI work, open `mons.xcodeproj`, select the `MonsDashboardFeature` scheme, then open
`Packages/MonsDashboardFeature/DashboardScreenPreviews.swift`. Xcode compiles the small
presentation dependency graph instead of launching the full authenticated app. Follow this same
boundary for new feature work: keep domain-to-presentation mapping in the app and keep previewable
UI state value-based and deterministic.

Before running OAuth on a physical device, finish Clerk's Native API configuration for bundle ID
`com.jeremyscott.mons` using the Apple App ID Prefix from the Apple Developer portal. The prefix is
not assumed to equal the development team ID.

The project, application target, test target, scheme, Swift module, and bundle identifiers
all use the `mons` name. Local Xcode user state and Derived Data are intentionally ignored.

Choose the API at build time with one of the shared schemes:

- `Mons Live` targets the active personal `sst dev` stage;
- `Mons Preview` targets the persistent preview for the current branch;
- `Mons Dev` targets `https://api.dev.mons.fit`;
- `Mons Prod` targets `https://api.mons.fit` with a Release build.

The selected URL is embedded in the app, with no runtime environment switch. Use Preview or Dev
when the installed phone build must continue working after the laptop is off. The complete flow is
documented in [Development environments](../../docs/development-environments.md). Barcode scanning
requires a physical device.

On first launch, Mons presents a compact step-by-step onboarding flow for metabolic inputs,
measurements, exercise frequency, normal daily activity, weight goal, and goal velocity. The
app previews the estimate locally, then saves the inputs to the API and uses the authoritative
returned calorie target throughout the calorie log. Dates and calculators accept injected clocks
and calendars so fixtures remain deterministic.

The workout builder saves a named exercise group as a reusable template. Exercise rows expand in
place to edit ordered weight, repetition, and rest prescriptions. Selecting a saved template
prepares it in the native iOS tab bottom accessory; starting it turns that accessory into a live
timer that remains available while moving between tabs.

## Design system

Mons uses Lunar Plum as its monochrome foundation, with a deliberately small set of semantic data
accents instead of screen-level color choices. The source tokens live in
`mons/DesignSystem/Foundation`:

- plum 25–150 provides light-mode backgrounds, surfaces, and borders;
- plum 900–1000 provides dark-mode backgrounds and light-mode text;
- near-white plum carries dark-mode text and high-contrast actions;
- flame orange identifies calories, protein red identifies protein, fat amber identifies fat, and
  carbohydrate blue identifies carbs;
- weight indigo is reserved for weight trends, while workout blue marks active workout controls;
- Error Red is reserved for destructive actions, validation failures, and critical alerts.

All semantic colors adapt automatically to the system light or dark appearance. Mons does not
force a color scheme. Primary, secondary, muted, action, and error foregrounds maintain at least
4.8:1 contrast against the app background in both appearances.

Spacing, corner radii, button styles, cards, and the wordmark are shared components under
`mons/DesignSystem`. Add new visual decisions there before adding one-off values to a feature.
Liquid Glass is limited to navigation, floating actions, and compact terminal-state toasts. The
native Search tab owns the bottom search field. A circular system `+` action stays in the top
toolbar and exposes barcode scanning without competing with the native search control.
Sheet content uses system material backgrounds so controls remain legible in both appearances.
Terminal action feedback uses compact Liquid Glass toasts: monochrome checks for success and Error
Red warnings for failures. Loading remains attached to the initiating control or empty content so
the app never presents an ambiguous global loading state.

Food detail uses the profile's calculated calorie and macro goals. Other compatible nutrients use
the FDA Daily Values for adults and children age four or older as deterministic nutrition-label
references. Nutrients without an applicable Daily Value are shown as `No DV`; Mons does not invent
targets or present these reference values as individualized clinical recommendations. Their
square-ended, lightly tinted bars are contextual indicators rather than percentage progress.
The fat breakdown intentionally presents only canonical user-facing totals (total, saturated,
monounsaturated, polyunsaturated, trans, omega-3, and omega-6), preferring source-reported totals
and hiding zero-value component/provenance rows.

[Space Grotesk](https://floriankarsten.github.io/space-grotesk/) is bundled locally in Regular,
Medium, and Bold weights under the SIL Open Font License. `MonsTypography` provides Dynamic
Type-aware roles; feature views should use those roles rather than fixed font sizes. The bundled
license is preserved at `mons/DesignSystem/Fonts/SPACE_GROTESK_LICENSE.txt`.
