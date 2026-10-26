# Validation — 26 October 2026

## Automated

`npm run check` passes: all linked local assets and anchors exist; JavaScript parses; the preview has no form, cart, checkout, price or countdown; the actual shared geometry retains the 195 mm closed height and 90 mm main lid, both helical threads, a continuous open drinking passage, no obsolete hinge/latch/plug components and finite cutaway vertices.

Text foreground/background contrast checks range from 4.69:1 to 11.24:1 for the main token combinations. This is a targeted accessibility check, not a complete conformance certification.

## Browser review

Reviewed in Chrome at normal desktop size, 390 × 844 and 360 × 800 viewport overrides. No horizontal document overflow was observed at the mobile widths. Temporary viewport overrides were reset after testing.

Verified the main Explore anchor, whole/cutaway/exploded views, screw-cap opening, detail selectors, rotation controls and native FAQ disclosure behavior. Both 3D viewers loaded. Browser diagnostics reported no warnings or errors during the reviewed flow. A final small copy-spacing correction and back/forward-cache resource cleanup fix were included before release.

Desktop and mobile screenshots are in `docs/screenshots/`. The static image fallback is present; an actual unsupported-WebGL device was not available for testing. Touch behavior and reduced-motion support are implemented, but were not verified on a physical phone or with a screen reader.

No physical product test has been performed. The site explicitly presents a coming-soon concept and no confirmed release date.
