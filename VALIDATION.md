# Validation

Version 1.1.0 validated on 2026-10-09, Node 22.23.3 and installed Google Chrome (Playwright).

## Live preview and content margins

`npm run check` and `npm test` pass (1 focused browser test, none skipped). Tests check all preset sizes and computed content padding, horizontal-rule containment inside each margin, live preview margin changes, separate theme font/color/background options, cancellation/restoration, print preparation, repeated initialization and responsive safety. Desktop (1100 px) and mobile (390 px) dialog screenshots were inspected without overlapping controls or horizontal overflow. No OS print dialog or physical printer was exercised for this update. The preview shows continuous layout, not final pagination. Firefox/WebKit and other-plugin combinations were not rerun; historical evidence below is not validation of this release.

## Previous 1.0.1 divider margin regression

`npm run check` and `npm test` pass (1 browser test, none skipped). All three presets are checked for their margin and text-size settings, containment of viewport-wide/negatively offset theme horizontal rules, removal of print-only heading decorations, and unchanged screen decorations. Existing print preparation/restoration and responsive checks remain passing.

An isolated Clean Print installation built successfully on actual upstream Digital Garden commit `80a33ffa6cb198ecf733e5944b4a60510970e3b0`, with no core source edits. Chrome generated PDFs for Compact, Standard and Large Text. PyMuPDF measured divider endpoints at their respective 12, 18 and 24 mm page margins (within 2 pt browser rounding tolerance); rendered first pages were reviewed visually. No browser page errors occurred. The native OS print dialog and physical printers were not exercised. Other-plugin combinations were not rerun for this patch; historical evidence follows.

## Standalone

`npm ci`, `npm run check`, `npm test`: 1 tests passed, none skipped. Tests include real Chromium interactions on focused fixtures, syntax/manifest checks and any existing Node unit coverage. Native printing is stubbed; no OS print dialog opens.

## Previous upstream integration

Initial release validation used upstream Digital Garden commit `80a33ffa6cb198ecf733e5944b4a60510970e3b0` and registry commit `ed1b497a4cd584721edf51e7c1a3ef9481229818`. Each of the six reading/layout plugins was installed and built individually on Node 22. No core source modifications were required.

Every nonempty subset of the six reading/layout plugins (63) was browser-tested against the actual compiled upstream page at 1800, 1100 and 390 px widths. The harness selects emitted runtime scripts/styles while preserving current core markup and configuration slots; it does not rebuild all 63 combinations separately. Checks cover responsive overflow, native right-sheet compatibility, single footer ownership, repeated initialization, folded-target navigation and complete print visibility. Six permutations of Appearance, Print and Resizable initialization passed; removing the Appearance contribution left the other controls usable.

Eight separate stress scenarios passed: left-only, right-only, no panes, both collapsed across reading-width classes; reversible mouse snap and synthetic browser TouchEvents with preferred-width restoration; fold/TOC/progress/print cancellation; canvas; no headings. Console errors and uncaught page errors were asserted absent in final subset and stress runs.

`TZ=UTC npm test` in upstream: 390 tests passed. Without UTC, upstream's two date expectations fail in America/Chicago (388 pass); core was not changed to hide this timezone issue.

## Screenshot

`screenshot.png` is a real screenshot captured from this current upstream test garden with synthetic public demonstration notes, not a generated/mock illustration.

## Limits

Chromium/Edge was exercised, not Firefox/WebKit or physical touch hardware. Native browser `dialog`, modern layout CSS and optional relative OKLCH are used; unsupported relative colors fall back to the theme accent. Accent contrast is checked against the primary background, not every possible third-party theme surface. Current core uses full-document navigation; disabling/uninstalling is supported through rebuild and page reload, not a hot-unload API. Third-party navigation replacements may require integration checks.
