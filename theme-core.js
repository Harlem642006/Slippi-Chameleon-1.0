"use strict";

const CONTROL_KEYS = [
  "headerBar",
  "tabBar",
  "activeTabUnderline",
  "cardFill",
  "cardBorder",
  "cardTitle",
  "primaryText",
  "mutedText",
  "accentText",
  "buttons",
  "carouselDots",
  "scrollbar",
  "icons",
  "bottomBar",
  "playButtonFill",
  "playButtonBorder",
  "playButtonTextIcon",
  "headerLeftBackground",
  "logoBackground",
];

const GRADIENT_KEYS = ["header", "headerLeft", "cards", "buttons"];
const ELEMENT_RULE_COLORS = [
  "background",
  "text",
  "border",
  "playFill",
  "playBorder",
  "playTextIcon",
  "gradientStart",
  "gradientEnd",
];

const DEFAULT_THEME = {
  background: { mode: "solid", colors: ["#202124"], angle: 135 },
  colors: {},
  gradients: {},
  rules: {},
};

function parseHexColor(value, name) {
  if (typeof value !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    throw new Error(`${name} must be a #RGB or #RRGGBB color`);
  }

  const hex = value.slice(1);
  const fullHex = hex.length === 3 ? [...hex].map((part) => part + part).join("") : hex;
  return [
    Number.parseInt(fullHex.slice(0, 2), 16),
    Number.parseInt(fullHex.slice(2, 4), 16),
    Number.parseInt(fullHex.slice(4, 6), 16),
  ];
}

function toHexColor(rgb) {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mixColors(first, second, amount) {
  return first.map((channel, index) => channel * (1 - amount) + second[index] * amount);
}

function rgbToHsl(rgb) {
  const [red, green, blue] = rgb.map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue /= 6;
    if (hue < 0) {
      hue += 1;
    }
  }

  return [hue, saturation, lightness];
}

function hslToRgb([hue, saturation, lightness]) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePart = hue * 6;
  const x = chroma * (1 - Math.abs((huePart % 2) - 1));
  const match = lightness - chroma / 2;
  let rgb;
  if (huePart < 1) {
    rgb = [chroma, x, 0];
  } else if (huePart < 2) {
    rgb = [x, chroma, 0];
  } else if (huePart < 3) {
    rgb = [0, chroma, x];
  } else if (huePart < 4) {
    rgb = [0, x, chroma];
  } else if (huePart < 5) {
    rgb = [x, 0, chroma];
  } else {
    rgb = [chroma, 0, x];
  }
  return rgb.map((channel) => (channel + match) * 255);
}

function normalizeBackground(rgb) {
  const [hue, saturation, lightness] = rgbToHsl(rgb);
  return hslToRgb([hue, Math.min(saturation, 0.72), Math.max(0.06, Math.min(lightness, 0.22))]);
}

function relativeLuminance(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function readableMutedText(foreground, background) {
  const maximumMix = 0.42;
  const minimumContrast = 4.6;
  const initial = mixColors(foreground, background, maximumMix);
  if (contrastRatio(initial, background) >= minimumContrast) {
    return initial;
  }

  let low = 0;
  let high = maximumMix;
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const middle = (low + high) / 2;
    if (contrastRatio(mixColors(foreground, background, middle), background) >= minimumContrast) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return mixColors(foreground, background, low);
}

function normalizeStops(value, name) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
    throw new Error(`${name} must contain two or three colors`);
  }
  return value.map((color, index) => {
    return toHexColor(parseHexColor(color, `${name}[${index}]`)).toUpperCase();
  });
}

function normalizeAngle(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 360) {
    throw new Error(`${name} must be a number from 0 to 360`);
  }
  return value;
}

function normalizeTheme(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("theme.json must contain a JSON object");
  }

  let background = config.background;
  if (typeof background === "string") {
    parseHexColor(background, "background");
    background = { mode: "solid", colors: [background], angle: 135 };
  }
  if (!background || typeof background !== "object" || Array.isArray(background)) {
    throw new Error("background must be a color or background object");
  }
  const mode = background.mode;
  if (mode !== "solid" && mode !== "gradient") {
    throw new Error("background.mode must be solid or gradient");
  }
  let colors;
  if (mode === "solid") {
    const color = Array.isArray(background.colors) ? background.colors[0] : background.color || "#202124";
    colors = [toHexColor(parseHexColor(color, "background.colors[0]")).toUpperCase()];
  } else {
    colors = normalizeStops(background.colors || background.stops, "background.colors");
  }
  if (mode === "gradient" && colors.length < 2) {
    throw new Error("gradient backgrounds need at least two colors");
  }
  const normalizedBackground = {
    mode,
    colors,
    angle: normalizeAngle(background.angle ?? 135, "background.angle"),
  };

  const colorOverrides = { ...(config.colors || {}) };
  if (config.text !== undefined) {
    if (!config.text || typeof config.text !== "object" || Array.isArray(config.text)) {
      throw new Error("text must be an object when provided");
    }
    const textKeys = {
      title: "cardTitle",
      primary: "primaryText",
      secondary: "mutedText",
      accent: "accentText",
    };
    for (const [key, control] of Object.entries(textKeys)) {
      if (config.text[key] !== undefined && colorOverrides[control] === undefined) {
        parseHexColor(config.text[key], `text.${key}`);
        colorOverrides[control] = config.text[key];
      }
    }
  }

  const normalizedColors = {};
  for (const [key, color] of Object.entries(colorOverrides)) {
    if (!CONTROL_KEYS.includes(key)) {
      throw new Error(`Unknown color control: ${key}`);
    }
    normalizedColors[key] = toHexColor(parseHexColor(color, `colors.${key}`)).toUpperCase();
  }

  const normalizedGradients = {};
  const gradients = config.gradients ?? {};
  if (!gradients || typeof gradients !== "object" || Array.isArray(gradients)) {
    throw new Error("gradients must be an object");
  }
  for (const [key, gradient] of Object.entries(gradients)) {
    if (!GRADIENT_KEYS.includes(key)) {
      throw new Error(`Unknown gradient control: ${key}`);
    }
    if (gradient === null) {
      continue;
    }
    if (!gradient || typeof gradient !== "object" || Array.isArray(gradient)) {
      throw new Error(`gradients.${key} must be an object`);
    }
    normalizedGradients[key] = {
      colors: normalizeStops(gradient.colors, `gradients.${key}.colors`),
      angle: normalizeAngle(gradient.angle ?? 135, `gradients.${key}.angle`),
    };
  }

  const normalizedRules = {};
  const rules = config.rules ?? {};
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    throw new Error("rules must be an object");
  }
  for (const [selector, rule] of Object.entries(rules)) {
    if (!selector.trim() || selector.length > 400 || /[{}\n\r]/.test(selector)) {
      throw new Error("Element rule selectors must be non-empty CSS selectors under 400 characters");
    }
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      throw new Error(`rules[${JSON.stringify(selector)}] must be an object`);
    }
    const normalizedRule = {};
    for (const property of ELEMENT_RULE_COLORS) {
      if (rule[property] !== undefined) {
        normalizedRule[property] = toHexColor(
          parseHexColor(rule[property], `rules[${JSON.stringify(selector)}].${property}`),
        ).toUpperCase();
      }
    }
    if (Object.keys(normalizedRule).length > 0) {
      normalizedRules[selector] = normalizedRule;
    }
  }

  return {
    background: normalizedBackground,
    colors: normalizedColors,
    gradients: normalizedGradients,
    rules: normalizedRules,
  };
}

function derivePalette(config) {
  const theme = normalizeTheme(config);
  const backgroundRgb = theme.background.colors
    .map((color) => parseHexColor(color, "background.colors"))
    .reduce((average, color) => average.map((channel, index) => channel + color[index]), [0, 0, 0])
    .map((channel) => channel / theme.background.colors.length);
  const background = normalizeBackground(backgroundRgb);
  const light = [245, 241, 247];
  const dark = [24, 20, 28];
  const foreground = contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
  const opposite = foreground === light ? [255, 255, 255] : [0, 0, 0];
  const accent = mixColors(background, opposite, 0.48);
  const accentStrong = mixColors(background, opposite, 0.68);
  const accentText = contrastRatio(accentStrong, light) >= contrastRatio(accentStrong, dark) ? light : dark;
  const autoColors = {
    headerBar: toHexColor(mixColors(background, opposite, 0.08)),
    tabBar: toHexColor(mixColors(background, opposite, 0.04)),
    activeTabUnderline: toHexColor(accentStrong),
    cardFill: toHexColor(mixColors(background, [0, 0, 0], 0.1)),
    cardBorder: toHexColor(mixColors(background, opposite, 0.24)),
    cardTitle: toHexColor(mixColors(foreground, background, 0.06)),
    primaryText: toHexColor(mixColors(foreground, background, 0.14)),
    mutedText: toHexColor(readableMutedText(foreground, background)),
    accentText: toHexColor(accentStrong),
    buttons: toHexColor(accent),
    carouselDots: toHexColor(accentStrong),
    scrollbar: toHexColor(accent),
    icons: toHexColor(mixColors(foreground, background, 0.14)),
    bottomBar: toHexColor(mixColors(background, opposite, 0.08)),
    playButtonFill: toHexColor(accent),
    playButtonBorder: toHexColor(mixColors(accent, [255, 255, 255], 0.3)),
    playButtonTextIcon: toHexColor(mixColors(accent, [0, 0, 0], 0.82)),
    headerLeftBackground: toHexColor(mixColors(background, opposite, 0.08)),
    logoBackground: toHexColor(mixColors(background, opposite, 0.08)),
  };
  const colors = { ...autoColors, ...theme.colors };
  const headerBackground = parseHexColor(colors.headerBar, "colors.headerBar");
  const headerText =
    contrastRatio(headerBackground, light) >= contrastRatio(headerBackground, dark) ? light : dark;
  const variables = {};
  for (const [key, value] of Object.entries(colors)) {
    variables[`--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] = value;
  }

  const backgroundStops = theme.background.colors;
  const exactBackground = theme.background.mode === "solid" ? toHexColor(background) : backgroundStops[0];
  Object.assign(variables, {
    "--theme-background": exactBackground,
    "--theme-background-image":
      theme.background.mode === "gradient"
        ? `linear-gradient(${theme.background.angle}deg, ${backgroundStops.map((color, index) => `${color} ${Math.round((index / (backgroundStops.length - 1)) * 100)}%`).join(", ")})`
        : "none",
    "--theme-surface": toHexColor(mixColors(background, [0, 0, 0], 0.05)),
    "--theme-card-hover": toHexColor(mixColors(background, [0, 0, 0], 0.16)),
    "--theme-accent": toHexColor(accent),
    "--theme-accent-strong": toHexColor(accentStrong),
    "--theme-text-on-accent": toHexColor(accentText),
    "--theme-overlay": `color-mix(in srgb, ${exactBackground} 92%, transparent)`,
    "--theme-buttons-fill": theme.colors.buttons || "transparent",
    "--theme-tab-bar-fill": theme.colors.tabBar || "transparent",
    "--theme-header-text": toHexColor(headerText),
    "--theme-border": colors.cardBorder,
    "--theme-text-title": colors.cardTitle,
    "--theme-text-primary": colors.primaryText,
    "--theme-text-secondary": colors.mutedText,
    "--theme-text-accent": colors.accentText,
    "--theme-header-left-start": theme.gradients.headerLeft?.colors[0] || toHexColor(mixColors(background, accent, 0.65)),
    "--theme-header-left-end": theme.gradients.headerLeft?.colors.at(-1) || colors.headerBar,
    "--theme-header-left-background": colors.headerLeftBackground,
    "--theme-logo-background": colors.logoBackground,
  });

  const aliases = {
    "--bg-color": "--theme-background",
    "--bg-accent-color": "--theme-active-tab-underline",
    "--bg-border-color": "--theme-card-border",
    "--card-surface": "--theme-card-fill",
    "--card-surface-hover": "--theme-card-hover",
    "--card-overlay": "--theme-overlay",
    "--card-accent": "--theme-accent-text",
    "--card-accent-strong": "--theme-active-tab-underline",
    "--card-text-primary": "--theme-primary-text",
    "--card-text-secondary": "--theme-muted-text",
    "--card-text-dim": "--theme-muted-text",
    "--card-text-very-dim": "--theme-muted-text",
    "--card-text-accent": "--theme-accent-text",
    "--card-border": "--theme-card-border",
    "--purple-darker": "--theme-background",
    "--purple-dark": "--theme-surface",
    "--purple": "--theme-background",
    "--purple-light": "--theme-accent-text",
    "--purple-lighter": "--theme-active-tab-underline",
    "--purple-primary": "--theme-accent-text",
    "--green-primary": "--theme-accent-text",
    "--green-bright": "--theme-active-tab-underline",
    "--green-dark": "--theme-active-tab-underline",
    "--green-darker": "--theme-accent-text",
    "--off-white": "--theme-primary-text",
    "--text-primary": "--theme-primary-text",
    "--text-secondary": "--theme-muted-text",
    "--text-dim": "--theme-muted-text",
    "--text-very-dim": "--theme-muted-text",
  };
  for (const [name, variable] of Object.entries(aliases)) {
    variables[name] = `var(${variable})`;
  }

  return variables;
}

function compileTheme(config, cssTemplate) {
  const variables = Object.entries(derivePalette(config))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${cssTemplate}\n:root {\n${variables}\n}\n`;
}

const api = { CONTROL_KEYS, DEFAULT_THEME, compileTheme, derivePalette, normalizeTheme, parseHexColor };
if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.__SLIPPI_THEME_API__ = api;
}
