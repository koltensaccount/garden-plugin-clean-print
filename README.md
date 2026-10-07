# Clean Print for Digital Garden

Prints notes with black text on white paper regardless of the installed screen
theme. A subtle printer icon sits beside Theme Toggle in the navigation footer.
Works independently when Theme Toggle is disabled or absent.

The icon and Ctrl+P/Cmd+P open a compact settings dialog: paper, orientation,
margins, text size, note name, page numbers, print date, images, expanded callouts,
and link addresses. **Print / PDF** opens the browser's normal print dialog,
where a printer or Save as PDF can be selected. Visitor options are remembered
unless disabled in the garden plugin menu.

Printing from the browser's own menu also applies the clean stylesheet, using
the current/default print options. Sidebars, site controls, comments and media
players are excluded. Printing does not change the visitor's screen theme.
Canvas pages are excluded.

## Browser support

Custom page numbers use CSS page margin boxes, supported in modern Chrome and
Edge (Chromium 131+). Other browsers may omit them. See the official documentation:
https://developer.chrome.com/blog/print-margins

Turn off the browser print dialog's built-in **Headers and footers** to avoid
duplicate footers. Browser/printer settings can override CSS paper sizes or
margins. The plugin does not control printer selection, copies, duplex or the
browser's Save as PDF destination. Those stay in the native print dialog.

## Install and develop

Install the public GitHub repository URL in Digital Garden's **Install from
GitHub** menu. Requires a garden template with garden plugin support. Publish
or redeploy after changing plugin settings.

No build or dependency installation is needed:

```sh
npm run check
npm run install:garden -- /path/to/my-digital-garden
```

The local installer preserves existing settings. Bump both version fields for
updates. Digital Garden prefers the latest GitHub release when one exists,
otherwise the default branch.
