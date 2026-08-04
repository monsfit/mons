# Mons

Mons is the SwiftUI client application.

It connects to the Regolith API for:

- adult onboarding that estimates TDEE and a weight-goal calorie target;
- a dashboard for today's nutrition, weekly workouts, and weight trend;
- separate Common and Branded food search sections with compact nutrition summaries;
- camera barcode scanning with normalized UPC/EAN/GTIN lookup;
- quantity-scaled food details, daily-target impact, logging, and day summaries;
- persistent strength/cardio workouts and ordered sets.
- canonical weight tracking with pound and kilogram entry.

Open `mons.xcodeproj` in Xcode, or build and test it from the repository root:

```bash
npx pnpm@11.20.0 mons:test
```

The project, application target, test target, scheme, Swift module, and bundle identifiers
all use the `mons` name. Local Xcode user state and Derived Data are intentionally ignored.

The default API URL is `http://127.0.0.1:3000`, which works from the iOS Simulator and the
macOS build. Start PostgreSQL and the API before launching Mons:

```bash
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 dev
```

For a physical iPhone, add the `REGOLITH_API_BASE_URL` environment variable to the Xcode
scheme's Run action and set it to the Mac's LAN address, such as
`http://192.168.1.10:3000`. Barcode scanning requires a physical device.

On first launch, Mons presents a compact step-by-step onboarding flow for metabolic inputs,
measurements, exercise frequency, normal daily activity, weight goal, and goal velocity. The
app previews the estimate locally, then saves the inputs to the API and uses the authoritative
returned calorie target throughout the calorie log. Dates and calculators accept injected clocks
and calendars so fixtures remain deterministic.

## Design system

Mons uses a dark, warm performance palette with semantic roles instead of screen-level color
choices. The source tokens live in `mons/DesignSystem/Foundation`:

- ink and black olive form the app background and chrome;
- surface and raised surface define cards, lists, and controls;
- ivory and white carry the primary type hierarchy, with mist and muted for supporting text;
- ember is reserved for primary actions and calorie energy;
- teal communicates performance and progress;
- olive anchors the brand, while plum is reserved for recovery-oriented data;
- success and error have dedicated, non-accent semantic roles.

Spacing, corner radii, button styles, cards, and the wordmark are shared components under
`mons/DesignSystem`. Add new visual decisions there before adding one-off values to a feature.

[Space Grotesk](https://floriankarsten.github.io/space-grotesk/) is bundled locally in Regular,
Medium, and Bold weights under the SIL Open Font License. `MonsTypography` provides Dynamic
Type-aware roles; feature views should use those roles rather than fixed font sizes. The bundled
license is preserved at `mons/DesignSystem/Fonts/SPACE_GROTESK_LICENSE.txt`.
