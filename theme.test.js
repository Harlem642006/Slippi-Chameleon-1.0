"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { compileTheme, derivePalette, normalizeTheme, parseHexColor, prefixSvgIds } = require("./index");

void test("loads the inline SVG asset and prefixes gradient ids", () => {
  const svg = fs.readFileSync(path.join(__dirname, "assets", "slippi-chameleon.svg"), "utf8");
  const inlineSvg = prefixSvgIds(svg);

  assert.match(inlineSvg, /<svg\b/);
  assert.doesNotMatch(inlineSvg, /<img\b/i);
  assert.match(inlineSvg, /id="slt-bg"/);
  assert.match(inlineSvg, /url\(#slt-bg\)/);
  assert.doesNotMatch(inlineSvg, /url\(#bg\)/);
});

void test("derives card, border, accent, and text variables from the background", () => {
  const palette = derivePalette({ background: "#123" });

  assert.equal(palette["--theme-background"], "#112233");
  assert.notEqual(palette["--theme-card-fill"], palette["--theme-background"]);
  assert.ok(
    Number.parseInt(palette["--theme-card-fill"].slice(1), 16) <
      Number.parseInt(palette["--theme-background"].slice(1), 16),
  );
  assert.notEqual(palette["--theme-accent"], palette["--theme-border"]);
  assert.equal(palette["--theme-text-primary"], "#d5d4dc");
});

void test("clamps bright base colors to a dark, subdued palette", () => {
  const palette = derivePalette({ background: "#ff0000" });

  assert.equal(palette["--theme-background"], "#601010");
  assert.ok(
    Number.parseInt(palette["--theme-card-fill"].slice(1), 16) <
      Number.parseInt(palette["--theme-background"].slice(1), 16),
  );
});

void test("keeps button and tab-bar fills transparent in Auto", () => {
  const automatic = derivePalette({ background: "#1B0B28" });
  assert.equal(automatic["--theme-buttons-fill"], "transparent");
  assert.equal(automatic["--theme-tab-bar-fill"], "transparent");

  const custom = derivePalette({
    background: "#1B0B28",
    colors: { buttons: "#123456", tabBar: "#abcdef" },
  });
  assert.equal(custom["--theme-buttons-fill"], "#123456");
  assert.equal(custom["--theme-tab-bar-fill"], "#ABCDEF");
});

void test("derives Play and header-left colors from the theme accent", () => {
  const palette = derivePalette({ background: "#1B0B28" });
  const luminance = (color) => {
    const linear = parseHexColor(color, "test color").map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };

  assert.equal(palette["--theme-play-button-fill"], palette["--theme-accent"]);
  assert.ok(luminance(palette["--theme-play-button-border"]) > luminance(palette["--theme-play-button-fill"]));
  assert.ok(luminance(palette["--theme-play-button-text-icon"]) < luminance(palette["--theme-play-button-fill"]));
  assert.ok(
    (luminance(palette["--theme-play-button-fill"]) + 0.05) /
      (luminance(palette["--theme-play-button-text-icon"]) + 0.05) >=
      4.5,
  );
  assert.equal(palette["--theme-header-left-end"], palette["--theme-header-bar"]);
  assert.notEqual(palette["--theme-header-left-start"], palette["--theme-header-left-end"]);

  const custom = derivePalette({
    background: "#123",
    colors: { playButtonFill: "#FF0000", playButtonBorder: "#00FF00" },
    gradients: { headerLeft: { colors: ["#112233", "#445566"], angle: 90 } },
  });
  assert.equal(custom["--theme-play-button-fill"], "#FF0000");
  assert.equal(custom["--theme-play-button-border"], "#00FF00");
  assert.equal(custom["--theme-header-left-start"], "#112233");
  assert.equal(custom["--theme-header-left-end"], "#445566");
});

void test("keeps automatic muted text readable against the derived background", () => {
  const palette = derivePalette({ background: "#0E3F58" });
  const background = parseHexColor(palette["--theme-background"], "background");
  const mutedText = parseHexColor(palette["--theme-muted-text"], "mutedText");

  const luminance = (rgb) =>
    rgb
      .map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const backgroundLuminance = luminance(background);
  const mutedTextLuminance = luminance(mutedText);
  const contrast =
    (Math.max(backgroundLuminance, mutedTextLuminance) + 0.05) /
    (Math.min(backgroundLuminance, mutedTextLuminance) + 0.05);

  assert.ok(contrast >= 4.5, `Expected at least 4.5:1 contrast, got ${contrast.toFixed(2)}:1`);
});

void test("accepts optional text color overrides", () => {
  const palette = derivePalette({
    background: "#1b0b28",
    text: { title: "#abcdef", accent: "#123456" },
  });

  assert.equal(palette["--theme-text-title"], "#ABCDEF");
  assert.equal(palette["--theme-text-accent"], "#123456");
});

void test("normalizes solid and two- or three-stop gradient backgrounds", () => {
  const gradient = normalizeTheme({
    background: { mode: "gradient", colors: ["#123", "#456", "#789"], angle: 220 },
  });
  assert.deepEqual(gradient.background, {
    mode: "gradient",
    colors: ["#112233", "#445566", "#778899"],
    angle: 220,
  });
  assert.deepEqual(normalizeTheme({ background: "#123" }).background, {
    mode: "solid",
    colors: ["#112233"],
    angle: 135,
  });
});

void test("keeps Auto colors out of the saved overrides and validates manual element rules", () => {
  const config = normalizeTheme({
    background: { mode: "solid", colors: ["#123"], angle: 135 },
    colors: { buttons: "#abcdef", playButtonFill: "#123456", headerLeftBackground: "#654321" },
    gradients: { headerLeft: { colors: ["#111", "#222"], angle: 90 } },
    rules: {
      '[data-testid="sample"]': {
        text: "#fff",
        playFill: "#123456",
        gradientStart: "#abcdef",
      },
    },
  });

  assert.deepEqual(config.colors, {
    buttons: "#ABCDEF",
    playButtonFill: "#123456",
    headerLeftBackground: "#654321",
  });
  assert.deepEqual(config.rules, {
    '[data-testid="sample"]': { text: "#FFFFFF", playFill: "#123456", gradientStart: "#ABCDEF" },
  });
  assert.deepEqual(config.gradients, {
    headerLeft: { colors: ["#111111", "#222222"], angle: 90 },
  });
  assert.throws(
    () => normalizeTheme({ background: "#123", rules: { ".sample": { text: "invalid" } } }),
    /rules.*text must be/,
  );
});

void test("rejects malformed color values with a useful field name", () => {
  assert.throws(() => parseHexColor("purple", "background"), /background must be/);
  assert.throws(() => derivePalette({ background: "#000000", text: { secondary: "#12" } }), /text\.secondary must be/);
});

void test("compiles derived variables after the stylesheet rules", () => {
  const css = compileTheme({ background: "#000000" }, ".test { color: red; }");
  assert.match(css, /\.test \{ color: red; \}/);
  assert.match(css, /--theme-background: #0f0f0f;/);
});
