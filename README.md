Unofficial theme overlay for Slippi Launcher. Not affiliated with Slippi.

# Slippi Chameleon

![Slippi Chameleon icon](assets/slippi-chameleon.png)

This helper starts the installed launcher with Chromium remote debugging enabled,
then injects local CSS and JavaScript into its window. It does not edit the
launcher installation or interact with Dolphin.

## Install and use

1. Install Node.js 20 or newer.
2. Open a terminal in the `slippi-chameleon` folder and run `npm install`.
3. Double-click `Slippi Chameleon.bat`.

The helper starts the official launcher and adds a floating Slippi Chameleon icon button to open
the theme editor. Theme changes apply live and save to `slippi-chameleon/theme.json`. The editor
supports solid or 2–3 stop gradient backgrounds, Auto or manually selected
colors for launcher elements, optional header/card/button gradients, gradient
presets, click-to-pick element rules, and JSON import/export. The editor also
provides Auto or custom Play fill, border, text/icon, header-left background
(solid or gradient), and logo-area background controls. Auto Play colors follow
the theme accent; the header-left gradient fades a theme-derived tint into the
header color. The Play button's SVG fill, outline, and icon colors are changed
without changing its stock shape, layout, hover, or disabled behavior.

A picked selector that includes a hashed class displays a warning because it
may change after a launcher update. Saved element rules support background,
text, border, Play colors, and gradient start/end colors.

The icon button sits in the header just left of the settings gear and does not overlap the bottom support link. Button and
tab-bar fills remain transparent in Auto; choosing a manual Buttons or Tab bar
color enables that fill. Automatic muted text maintains at least 4.5:1 contrast
against the derived solid background. With the default base color and all
controls on Auto, the helper disables its appearance overrides so the launcher
retains its stock computed styles.

Theme colors and gradients omitted from `colors` or `gradients` are Auto and
derived from the background. Element rules are keyed by selector:

```json
{
  "background": {
    "mode": "gradient",
    "colors": ["#1B0B28", "#452B59"],
    "angle": 135
  },
  "colors": {
    "primaryText": "#E9EAEA"
  },
  "gradients": {},
  "rules": {
    "[data-testid=\"example\"]": {
      "background": "#29133B",
      "text": "#E9EAEA",
      "border": "#1E1F25"
    }
  }
}
```

Editing `slippi-chameleon/theme.json` by hand is supported and reloads the theme automatically.
Older files that use a hex string for `background` and a `text` object continue
to load.

To create a desktop shortcut without a console window, double-click
`slippi-chameleon/Create Desktop Shortcut.bat`. This creates
`Slippi Chameleon.lnk` on your Desktop with
`slippi-chameleon/assets/slippi-chameleon.ico` as its icon. The
`Slippi Chameleon.bat` file is also available as a convenient launcher.

If an existing launcher instance was started without remote debugging, close it
before starting the helper. The helper connects only to a local CDP endpoint on
`127.0.0.1:9222` and reports a clear timeout if the build does not expose it.
Keep this port local; CDP has no authentication.

The official launcher build uses hashed CSS Module classes in some areas. The
theme first overrides root CSS variables, then discovers generated MUI rules at
runtime. Header targets are located using the Play SVG viewBox and Slippi logo
image rather than hashed class names. It logs controls that have no matching
launcher elements; selectors and element rules may need adjustment after an
official launcher update.
