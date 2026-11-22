(() => {
  const api = window.__SLIPPI_THEME_API__;
  if (!api || window.location.protocol !== "file:") {
    return;
  }

  const DEFAULT_THEME = api.DEFAULT_THEME;
  const CONTROL_LABELS = {
    headerBar: "Header bar",
    tabBar: "Tab bar",
    activeTabUnderline: "Active tab underline",
    cardFill: "Card fill",
    cardBorder: "Card border",
    cardTitle: "Card titles",
    primaryText: "Primary text",
    mutedText: "Muted text",
    accentText: "Accent text",
    buttons: "Buttons",
    carouselDots: "Carousel dots",
    scrollbar: "Scrollbar",
    icons: "Icons",
    bottomBar: "Bottom bar",
    playButtonFill: "Play button fill",
    playButtonBorder: "Play button border",
    playButtonTextIcon: "Play text and icon",
    headerLeftBackground: "Header-left background",
    logoBackground: "Logo area background",
  };
  const SELECTORS = {
    headerBar: 'header, [role="banner"], [class*="header" i], [style*="--launcher-menu-background-color"]',
    tabBar: '[role="tablist"], [class~="MuiTabs-root"], [class*="tab-bar" i]',
    activeTabUnderline: '[class~="MuiTabs-indicator"], [class*="indicator" i]',
    cardFill: '[class*="card" i], [class~="MuiCard-root"], [class~="d9FHwUIvHBcRcIdkywZT"]',
    cardBorder: '[class*="card" i], [class~="MuiCard-root"], [class~="MuiPaper-root"], [class~="oBWER0wQJct8tOg0AcPP"]',
    cardTitle: 'h1, h2, h3, h4, h5, h6, [class*="card-title" i], [class~="MuiCardHeader-title"]',
    primaryText: "body, [class~=\"MuiTypography-root\"]",
    mutedText: '[class~="MuiTypography-colorTextSecondary"], small, [class*="muted" i], [class*="secondary-text" i]',
    accentText: 'a, [class*="accent" i], [class~="MuiButton-textPrimary"]',
    buttons:
      'button:not([class*="play" i]):not([aria-label*="play" i]):not([data-slt-play-button]):not([data-slt-logo-button]):not(#slt-theme-button):not(#slt-theme-panel button):not(#slt-element-popup button), [role="button"]:not([class*="play" i]):not([aria-label*="play" i]):not([data-slt-play-button]):not([data-slt-logo-button]):not(#slt-theme-button):not(#slt-theme-panel *):not(#slt-element-popup *), [class~="MuiButton-root"]:not([class*="play" i]):not([data-slt-play-button]):not([data-slt-logo-button]):not(#slt-theme-button):not(#slt-theme-panel button):not(#slt-element-popup button)',
    carouselDots:
      '[class*="carousel" i] button, [class*="dot" i], [class~="_62VHLMosY62vi0rxbehg"], [class~="O29S6dqjUoryFy6MRC9v"]',
    scrollbar: "html",
    icons: "svg, [class*=\"icon\" i], [class~=\"MuiSvgIcon-root\"]",
    bottomBar: 'footer, [class*="bottom-bar" i], [class*="footer" i]',
    playButtonFill: '[data-slt-play-button="true"]',
    playButtonBorder: '[data-slt-play-button="true"]',
    playButtonTextIcon: '[data-slt-play-button="true"]',
    headerLeftBackground: '[data-slt-header-left="true"]',
    logoBackground: '[data-slt-logo-button="true"]',
  };
  const MUI_CLASS_TO_CONTROL = [
    ["activeTabUnderline", /MuiTabs-indicator/],
    ["tabBar", /MuiTabs-root/],
    ["cardFill", /MuiCard-root/],
    ["cardBorder", /MuiCard-root/],
    ["cardTitle", /Mui(?:CardHeader-title|Typography-h[1-6])/],
    ["primaryText", /MuiTypography-root/],
    ["mutedText", /MuiTypography-colorTextSecondary/],
    ["accentText", /Mui(?:Button-textPrimary|Link-root)/],
    ["buttons", /MuiButton-(?:contained|outlined)/],
    ["icons", /Mui(?:SvgIcon-root|IconButton-root)/],
  ];
  const CONTROL_PROPERTY = {
    headerBar: "background-color",
    tabBar: "background-color",
    activeTabUnderline: "background-color",
    cardFill: "background-color",
    cardBorder: "border-color",
    cardTitle: "color",
    primaryText: "color",
    mutedText: "color",
    accentText: "color",
    buttons: "background-color",
    carouselDots: "background-color",
    scrollbar: "background-color",
    icons: "color",
    bottomBar: "background-color",
  };
  const ELEMENT_RULE_PROPERTIES = {
    background: "background-color",
    text: "color",
    border: "border-color",
    playFill: "--theme-play-button-fill",
    playBorder: "--theme-play-button-border",
    playTextIcon: "--theme-play-button-text-icon",
    gradientStart: "--theme-header-left-start",
    gradientEnd: "--theme-header-left-end",
  };

  const state = window.__SLIPPI_THEME_STATE__ || {};
  state.config = api.normalizeTheme(window.__SLIPPI_THEME_CONFIG__ || DEFAULT_THEME);
  state.defaultConfig = api.normalizeTheme(window.__SLIPPI_THEME_DEFAULT__ || DEFAULT_THEME);
  state.editorCss = window.__SLIPPI_THEME_EDITOR_CSS__ || "";
  state.themeCss = window.__SLIPPI_THEME_CSS__ || "";
  state.appliedRules ||= new Map();
  state.appliedPaletteVariables ||= new Set();
  state.lastDiagnostics = {};

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const ruleColors = (selector) => state.config.rules[selector] || {};
  const selectorMatches = (selector) => {
    const matches = [...document.querySelectorAll(selector)];
    return matches.filter((element) => !element.closest("#slt-theme-button, #slt-theme-panel, #slt-element-popup"));
  };

  state.applyConfig = (config) => {
    state.config = api.normalizeTheme(config);
    state.discoverHeaderTargets();
    const palette = api.derivePalette(state.config);
    const rootStyle = document.documentElement?.style;
    for (const name of state.appliedPaletteVariables) {
      rootStyle?.removeProperty(name);
    }
    state.appliedPaletteVariables.clear();

    state.isStockAppearance = JSON.stringify(state.config) === JSON.stringify(state.defaultConfig);
    const themeStyle = document.getElementById("slippi-external-theme");
    if (state.isStockAppearance) {
      if (themeStyle) {
        themeStyle.textContent = "";
      }
    } else {
      if (themeStyle && themeStyle.textContent !== state.themeCss) {
        themeStyle.textContent = state.themeCss;
      }
      for (const [name, value] of Object.entries(palette)) {
        rootStyle?.setProperty(name, value);
        state.appliedPaletteVariables.add(name);
      }
    }
    state.refreshMUIOverrides();
    state.applyElementRules();
    state.logUnmatchedControls();
  };

  state.update = (config, save = true) => {
    state.applyConfig(config);
    state.renderControls?.();
    if (save) {
      clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(() => {
        if (typeof window.__slippiThemeSave === "function") {
          window.__slippiThemeSave(JSON.stringify(state.config));
        }
      }, 200);
    }
  };

  state.updateConfig = (update) => {
    const next = clone(state.config);
    update(next);
    state.update(next);
  };

  state.discoverMuiRules = () => {
    const found = Object.fromEntries(Object.keys(CONTROL_LABELS).map((key) => [key, new Set()]));
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.selectorText) {
          for (const [key, pattern] of MUI_CLASS_TO_CONTROL) {
            if (pattern.test(rule.selectorText)) {
              found[key].add(rule.selectorText);
            }
          }
        } else if (rule.cssRules) {
          visit(rule.cssRules);
        }
      }
    };

    for (const style of document.querySelectorAll("style")) {
      if (style.id.startsWith("slt-")) {
        continue;
      }
      const rules = style.sheet?.cssRules;
      if (rules) {
        visit(rules);
      }
    }
    return found;
  };

  state.discoverHeaderTargets = () => {
    for (const name of ["data-slt-play-button", "data-slt-header-left", "data-slt-logo-button"]) {
      document.querySelectorAll(`[${name}]`).forEach((element) => element.removeAttribute(name));
    }

    const playSvg = document.querySelector('svg[viewBox="0 0 166 45"]');
    const playButton = playSvg?.closest("button");
    if (playButton) {
      playButton.setAttribute("data-slt-play-button", "true");
    }

    const images = [...document.querySelectorAll("img")];
    const logoImage = images.find((image) => {
      const description = `${image.getAttribute("src") || ""} ${image.alt || ""}`;
      return /slippi[_ -]?logo/i.test(description);
    }) || images.find((image) => image.getAttribute("width") === "38");
    const logoButton = logoImage?.closest("button");
    if (logoButton) {
      logoButton.setAttribute("data-slt-logo-button", "true");
    }

    if (playButton) {
      let candidate = playButton.parentElement;
      while (candidate && candidate !== document.body) {
        if (logoImage && candidate.contains(logoImage)) {
          candidate.setAttribute("data-slt-header-left", "true");
          break;
        }
        candidate = candidate.parentElement;
      }
      if (!document.querySelector('[data-slt-header-left="true"]')) {
        const leftSection = playButton.parentElement?.parentElement?.parentElement;
        leftSection?.setAttribute("data-slt-header-left", "true");
      }
    }
  };

  state.refreshMUIOverrides = () => {
    const style = document.getElementById("slt-runtime-overrides");
    if (!style) {
      return;
    }
    if (state.isStockAppearance) {
      style.textContent = "";
      return;
    }
    const rules = [];
    const headerLeftGradient = state.config.gradients.headerLeft;
    if (headerLeftGradient) {
      const stops = headerLeftGradient.colors.map(
        (color, index) => `${color} ${Math.round((index / (headerLeftGradient.colors.length - 1)) * 100)}%`,
      );
      rules.push(
        `[data-slt-header-left="true"] { background-image: linear-gradient(${headerLeftGradient.angle}deg, ${stops.join(", ")}) !important; }`,
      );
    } else if (state.config.colors.headerLeftBackground !== undefined) {
      rules.push(
        '[data-slt-header-left="true"] { background-color: var(--theme-header-left-background) !important; background-image: none !important; }',
      );
    } else {
      rules.push(
        '[data-slt-header-left="true"] { background-image: linear-gradient(90deg, var(--theme-header-left-start), var(--theme-header-left-end)) !important; }',
      );
    }

    for (const [key, gradientsKey] of [
      ["headerBar", "header"],
      ["cardFill", "cards"],
      ["buttons", "buttons"],
    ]) {
      const gradient = state.config.gradients[gradientsKey];
      if (!gradient) {
        continue;
      }
      const stops = gradient.colors.map(
        (color, index) => `${color} ${Math.round((index / (gradient.colors.length - 1)) * 100)}%`,
      );
      const selectors = key === "headerBar" ? SELECTORS.headerBar : key === "cardFill" ? SELECTORS.cardFill : SELECTORS.buttons;
      rules.push(`${selectors} { background-image: linear-gradient(${gradient.angle}deg, ${stops.join(", ")}) !important; }`);
    }

    const muiRules = state.discoverMuiRules();
    for (const [key, selectors] of Object.entries(muiRules)) {
      if (selectors.size === 0) {
        continue;
      }
      const variable = `var(--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)})`;
      if ((key === "buttons" || key === "tabBar") && state.config.colors[key] === undefined) {
        continue;
      }
      const declaration = key === "buttons"
        ? `background-color: ${variable} !important; color: var(--theme-text-on-accent) !important; border-color: ${variable} !important;`
        : `${CONTROL_PROPERTY[key]}: ${variable} !important;`;
      rules.push(`${[...selectors].join(",\n")} { ${declaration} }`);
    }
    const css = rules.join("\n");
    if (style.textContent !== css) {
      style.textContent = css;
    }
  };

  state.logUnmatchedControls = () => {
    const muiRules = state.discoverMuiRules();
    for (const [key, selector] of Object.entries(SELECTORS)) {
      const matched = key === "scrollbar" || selectorMatches(selector).length > 0 || muiRules[key].size > 0;
      if (state.lastDiagnostics[key] === matched) {
        continue;
      }
      state.lastDiagnostics[key] = matched;
      if (!matched) {
        console.warn(`[Slippi Theme] ${CONTROL_LABELS[key]} did not affect anything: no matching launcher element was found.`);
      }
    }
  };

  state.applyElementRules = () => {
    for (const [element, previous] of state.appliedRules) {
      for (const [property, value] of Object.entries(previous)) {
        if (value.value) {
          element.style.setProperty(property, value.value, value.priority);
        } else {
          element.style.removeProperty(property);
        }
      }
    }
    state.appliedRules.clear();

    for (const [selector, colors] of Object.entries(state.config.rules)) {
      let elements;
      try {
        elements = selectorMatches(selector);
      } catch (error) {
        console.error(`[Slippi Theme] Invalid element selector ${JSON.stringify(selector)}: ${error.message}`);
        continue;
      }
      if (elements.length === 0) {
        console.warn(`[Slippi Theme] Element rule ${JSON.stringify(selector)} did not affect anything.`);
        continue;
      }
      for (const element of elements) {
        const previous = state.appliedRules.get(element) || {};
        for (const [key, property] of Object.entries(ELEMENT_RULE_PROPERTIES)) {
          if (!Object.hasOwn(previous, property)) {
            previous[property] = {
              value: element.style.getPropertyValue(property),
              priority: element.style.getPropertyPriority(property),
            };
          }
          if (colors[key]) {
            element.style.setProperty(property, colors[key], "important");
            if (key === "background" && element.matches('[data-slt-header-left="true"]')) {
              if (!Object.hasOwn(previous, "background-image")) {
                previous["background-image"] = {
                  value: element.style.getPropertyValue("background-image"),
                  priority: element.style.getPropertyPriority("background-image"),
                };
              }
              element.style.setProperty("background-image", "none", "important");
            }
          }
        }
        state.appliedRules.set(element, previous);
      }
    }
  };

  state.createEditor = () => {
    if (!document.body || document.getElementById("slt-theme-button")) {
      return;
    }
    const button = document.createElement("button");
    button.id = "slt-theme-button";
    button.className = "slt-button";
    button.type = "button";
    button.setAttribute("aria-label", "Open theme editor");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "";
    const icon = document.createElement("span");
    icon.className = "slt-button-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = window.__SLIPPI_CHAMELEON_ICON__ || "";
    button.appendChild(icon);

    const panel = document.createElement("section");
    panel.id = "slt-theme-panel";
    panel.className = "slt-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Theme editor");

    const header = document.createElement("div");
    header.className = "slt-header";
    const title = document.createElement("h2");
    title.className = "slt-title";
    title.textContent = "Slippi Chameleon";
    const close = document.createElement("button");
    close.className = "slt-close";
    close.type = "button";
    close.setAttribute("aria-label", "Close theme editor");
    close.textContent = "×";
    header.append(title, close);
    panel.appendChild(header);

    const addSection = (label) => {
      const heading = document.createElement("div");
      heading.className = "slt-section-label";
      heading.textContent = label;
      panel.appendChild(heading);
    };
    const addRow = (container, label, className = "slt-row") => {
      const row = document.createElement("div");
      row.className = className;
      const name = document.createElement("span");
      name.textContent = label;
      row.appendChild(name);
      container.appendChild(row);
      return row;
    };
    const addColorInput = (row, label, onInput) => {
      const input = document.createElement("input");
      input.className = "slt-color";
      input.type = "color";
      input.setAttribute("aria-label", label);
      input.addEventListener("input", () => onInput(input.value));
      row.appendChild(input);
      return input;
    };
    const addNumberInput = (row, label, min, max, onInput) => {
      const input = document.createElement("input");
      input.className = "slt-number";
      input.type = "number";
      input.min = String(min);
      input.max = String(max);
      input.setAttribute("aria-label", label);
      input.addEventListener("change", () => onInput(Number(input.value)));
      row.appendChild(input);
      return input;
    };
    const updateBackground = (background) => state.updateConfig((config) => {
      config.background = background;
    });

    addSection("Background");
    const modeRow = addRow(panel, "Mode");
    const modePicker = document.createElement("select");
    modePicker.className = "slt-select";
    modePicker.setAttribute("aria-label", "Background mode");
    for (const [value, label] of [["solid", "Solid"], ["gradient", "Gradient"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      modePicker.appendChild(option);
    }
    modeRow.appendChild(modePicker);
    const stopCountRow = addRow(panel, "Gradient stops");
    const stopCount = document.createElement("select");
    stopCount.className = "slt-select";
    stopCount.setAttribute("aria-label", "Number of gradient stops");
    for (const value of ["2", "3"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      stopCount.appendChild(option);
    }
    stopCountRow.appendChild(stopCount);
    const backgroundColorInputs = [];
    for (let index = 0; index < 3; index += 1) {
      const row = addRow(panel, `Background color ${index + 1}`);
      backgroundColorInputs.push(
        addColorInput(row, `Background color ${index + 1}`, (color) => {
          const current = state.config.background;
          const colors = [...current.colors];
          colors[index] = color;
          updateBackground({ ...current, colors });
        }),
      );
    }
    const angleRow = addRow(panel, "Gradient angle");
    const backgroundAngle = addNumberInput(angleRow, "Gradient angle", 0, 360, (angle) => {
      if (Number.isFinite(angle) && angle >= 0 && angle <= 360) {
        updateBackground({ ...state.config.background, angle });
      }
    });
    modePicker.addEventListener("change", () => {
      const current = state.config.background;
      const colors = current.mode === "solid" && modePicker.value === "gradient"
        ? [current.colors[0], "#452B59"]
        : current.mode === "gradient" && modePicker.value === "solid"
          ? [current.colors[0]]
          : current.colors;
      updateBackground({ mode: modePicker.value, colors, angle: current.angle });
    });
    stopCount.addEventListener("change", () => {
      const current = state.config.background;
      const colors = [...current.colors];
      while (colors.length < Number(stopCount.value)) {
        colors.push("#452B59");
      }
      updateBackground({ ...current, colors: colors.slice(0, Number(stopCount.value)) });
    });

    addSection("Colors (Auto follows the background)");
    state.colorControls = {};
    for (const [key, label] of Object.entries(CONTROL_LABELS)) {
      if (key === "headerLeftBackground") {
        continue;
      }
      const row = addRow(panel, label, "slt-row slt-color-row");
      const controls = document.createElement("span");
      controls.className = "slt-color-controls";
      const autoLabel = document.createElement("label");
      autoLabel.className = "slt-auto";
      const auto = document.createElement("input");
      auto.type = "checkbox";
      auto.setAttribute("aria-label", `Auto ${label}`);
      const autoText = document.createElement("span");
      autoText.textContent = "Auto";
      autoLabel.append(auto, autoText);
      const picker = addColorInput(controls, label, (color) => {
        auto.checked = false;
        state.updateConfig((config) => {
          config.colors[key] = color;
        });
      });
      controls.prepend(autoLabel);
      row.appendChild(controls);
      state.colorControls[key] = { auto, picker };
      auto.addEventListener("change", () => {
        state.updateConfig((config) => {
          if (auto.checked) {
            delete config.colors[key];
          } else {
            config.colors[key] = api.derivePalette(config)[`--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`];
          }
        });
      });
    }

    addSection("Header-left background");
    const headerLeftModeRow = addRow(panel, "Style", "slt-row slt-color-row");
    const headerLeftControls = document.createElement("span");
    headerLeftControls.className = "slt-color-controls";
    const headerLeftAutoLabel = document.createElement("label");
    headerLeftAutoLabel.className = "slt-auto";
    const headerLeftAuto = document.createElement("input");
    headerLeftAuto.type = "checkbox";
    headerLeftAuto.setAttribute("aria-label", "Auto header-left background");
    const headerLeftAutoText = document.createElement("span");
    headerLeftAutoText.textContent = "Auto";
    headerLeftAutoLabel.append(headerLeftAuto, headerLeftAutoText);
    const headerLeftMode = document.createElement("select");
    headerLeftMode.className = "slt-select";
    headerLeftMode.setAttribute("aria-label", "Header-left background style");
    for (const [value, label] of [["solid", "Solid"], ["gradient", "Gradient"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      headerLeftMode.appendChild(option);
    }
    headerLeftControls.append(headerLeftAutoLabel, headerLeftMode);
    headerLeftModeRow.appendChild(headerLeftControls);
    const headerLeftStartRow = addRow(panel, "Start / solid color");
    const headerLeftStart = addColorInput(headerLeftStartRow, "Header-left start or solid color", (color) => {
      if (headerLeftAuto.checked) {
        return;
      }
      state.updateConfig((config) => {
        if (headerLeftMode.value === "solid") {
          config.colors.headerLeftBackground = color;
          delete config.gradients.headerLeft;
        } else {
          const gradient = config.gradients.headerLeft || {
            colors: [color, api.derivePalette(config)["--theme-header-left-end"]],
            angle: 90,
          };
          gradient.colors[0] = color;
          config.gradients.headerLeft = gradient;
          delete config.colors.headerLeftBackground;
        }
      });
    });
    const headerLeftEndRow = addRow(panel, "End color");
    const headerLeftEnd = addColorInput(headerLeftEndRow, "Header-left gradient end color", (color) => {
      if (headerLeftAuto.checked || headerLeftMode.value !== "gradient") {
        return;
      }
      state.updateConfig((config) => {
        const gradient = config.gradients.headerLeft || {
          colors: [api.derivePalette(config)["--theme-header-left-start"], color],
          angle: 90,
        };
        gradient.colors[1] = color;
        config.gradients.headerLeft = gradient;
        delete config.colors.headerLeftBackground;
      });
    });
    headerLeftAuto.addEventListener("change", () => {
      state.updateConfig((config) => {
        if (headerLeftAuto.checked) {
          delete config.colors.headerLeftBackground;
          delete config.gradients.headerLeft;
          return;
        }
        if (headerLeftMode.value === "solid") {
          config.colors.headerLeftBackground = headerLeftStart.value;
          delete config.gradients.headerLeft;
        } else {
          config.gradients.headerLeft = {
            colors: [headerLeftStart.value, headerLeftEnd.value],
            angle: 90,
          };
          delete config.colors.headerLeftBackground;
        }
      });
    });
    headerLeftMode.addEventListener("change", () => {
      if (headerLeftAuto.checked) {
        return;
      }
      state.updateConfig((config) => {
        if (headerLeftMode.value === "solid") {
          config.colors.headerLeftBackground = headerLeftStart.value;
          delete config.gradients.headerLeft;
        } else {
          config.gradients.headerLeft = {
            colors: [headerLeftStart.value, headerLeftEnd.value],
            angle: 90,
          };
          delete config.colors.headerLeftBackground;
        }
      });
    });

    addSection("Optional element gradients");
    state.gradientControls = {};
    for (const [key, label] of [["header", "Header"], ["cards", "Cards"], ["buttons", "Buttons"]]) {
      const enabledRow = addRow(panel, `${label} gradient`, "slt-row slt-gradient-toggle");
      const enabled = document.createElement("input");
      enabled.type = "checkbox";
      enabled.setAttribute("aria-label", `Enable ${label.toLowerCase()} gradient`);
      enabledRow.appendChild(enabled);
      const colors = [];
      for (let index = 0; index < 2; index += 1) {
        const row = addRow(panel, `${label} stop ${index + 1}`);
        colors.push(addColorInput(row, `${label} stop ${index + 1}`, (color) => {
          const gradient = clone(state.config.gradients[key]);
          gradient.colors[index] = color;
          state.updateConfig((config) => {
            config.gradients[key] = gradient;
          });
        }));
      }
      const angleRow = addRow(panel, `${label} angle`);
      const angle = addNumberInput(angleRow, `${label} gradient angle`, 0, 360, (value) => {
        if (Number.isFinite(value) && value >= 0 && value <= 360) {
          state.updateConfig((config) => {
            config.gradients[key].angle = value;
          });
        }
      });
      enabled.addEventListener("change", () => {
        state.updateConfig((config) => {
          if (enabled.checked) {
            config.gradients[key] = config.gradients[key] || {
              colors: [config.background.colors[0], config.background.colors.at(-1) || "#452B59"],
              angle: 135,
            };
          } else {
            delete config.gradients[key];
          }
        });
      });
      state.gradientControls[key] = { enabled, colors, angle };
    }

    addSection("Gradient presets");
    const presets = document.createElement("div");
    presets.className = "slt-presets";
    const gradientPresets = [
      ["Violet", ["#1B0B28", "#452B59"]],
      ["Ocean", ["#101E33", "#174E61", "#1B0B28"]],
      ["Sunset", ["#29152E", "#643B4A", "#1B0B28"]],
      ["Emerald", ["#0B211B", "#246244", "#1B0B28"]],
      ["Crimson", ["#260D17", "#713047", "#1B0B28"]],
      ["Graphite", ["#171820", "#414554", "#1B0B28"]],
    ];
    for (const [name, colors] of gradientPresets) {
      const preset = document.createElement("button");
      preset.className = "slt-preset";
      preset.type = "button";
      preset.textContent = name;
      preset.addEventListener("click", () => {
        state.updateConfig((config) => {
          config.background = { mode: "gradient", colors, angle: 135 };
        });
      });
      presets.appendChild(preset);
    }
    panel.appendChild(presets);

    const pickMode = document.createElement("button");
    pickMode.className = "slt-action";
    pickMode.type = "button";
    pickMode.textContent = "Click to pick an element";
    pickMode.setAttribute("aria-pressed", "false");
    panel.appendChild(pickMode);
    const exportButton = document.createElement("button");
    exportButton.className = "slt-action";
    exportButton.type = "button";
    exportButton.textContent = "Export theme JSON";
    const importButton = document.createElement("button");
    importButton.className = "slt-action";
    importButton.type = "button";
    importButton.textContent = "Import theme JSON";
    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = ".json,application/json";
    importInput.hidden = true;
    panel.append(exportButton, importButton, importInput);
    exportButton.addEventListener("click", () => {
      const blob = new Blob([`${JSON.stringify(state.config, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = "slippi-theme.json";
      download.click();
      URL.revokeObjectURL(url);
    });
    importButton.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) {
        return;
      }
      try {
        state.update(await file.text().then((text) => api.normalizeTheme(JSON.parse(text))));
      } catch (error) {
        console.error(`[Slippi Theme] Theme import failed: ${error.message}`);
        window.alert(`Could not import theme: ${error.message}`);
      } finally {
        importInput.value = "";
      }
    });

    const reset = document.createElement("button");
    reset.className = "slt-reset";
    reset.type = "button";
    reset.textContent = "Reset to default";
    reset.addEventListener("click", () => state.update(clone(state.defaultConfig)));
    panel.appendChild(reset);

    const popup = document.createElement("section");
    popup.id = "slt-element-popup";
    popup.className = "slt-panel slt-popup";
    popup.hidden = true;
    popup.setAttribute("aria-label", "Selected element colors");
    const popupTitle = document.createElement("h2");
    popupTitle.className = "slt-title";
    popupTitle.textContent = "Element colors";
    const selectorName = document.createElement("code");
    selectorName.className = "slt-selector";
    const warning = document.createElement("p");
    warning.className = "slt-warning";
    warning.hidden = true;
    warning.textContent = "This selector includes a hashed class name and may break after a launcher update.";
    const popupControls = {};
    popup.append(popupTitle, selectorName, warning);
    for (const [key, label] of [
      ["background", "Background"],
      ["text", "Text"],
      ["border", "Border"],
      ["playFill", "Play fill"],
      ["playBorder", "Play border"],
      ["playTextIcon", "Play text/icon"],
      ["gradientStart", "Gradient start"],
      ["gradientEnd", "Gradient end"],
    ]) {
      const row = addRow(popup, label, "slt-row slt-color-row");
      const controls = document.createElement("span");
      controls.className = "slt-color-controls";
      const autoLabel = document.createElement("label");
      autoLabel.className = "slt-auto";
      const auto = document.createElement("input");
      auto.type = "checkbox";
      auto.setAttribute("aria-label", `Auto ${label.toLowerCase()}`);
      const autoText = document.createElement("span");
      autoText.textContent = "Auto";
      autoLabel.append(auto, autoText);
      const picker = addColorInput(controls, label, (color) => {
        auto.checked = false;
        updateElementRule(key, color);
      });
      controls.prepend(autoLabel);
      row.appendChild(controls);
      popupControls[key] = { auto, picker };
      auto.addEventListener("change", () => updateElementRule(key, auto.checked ? undefined : picker.value));
    }
    const closePopup = document.createElement("button");
    closePopup.className = "slt-action";
    closePopup.type = "button";
    closePopup.textContent = "Close element editor";
    closePopup.addEventListener("click", () => {
      popup.hidden = true;
      state.selectedSelector = undefined;
    });
    popup.appendChild(closePopup);
    const updateElementRule = (key, value) => {
      if (!state.selectedSelector) {
        return;
      }
      state.updateConfig((config) => {
        const rule = { ...(config.rules[state.selectedSelector] || {}) };
        if (value === undefined) {
          delete rule[key];
        } else {
          rule[key] = value;
        }
        if (Object.keys(rule).length > 0) {
          config.rules[state.selectedSelector] = rule;
        } else {
          delete config.rules[state.selectedSelector];
        }
      });
    };

    state.renderControls = () => {
      const background = state.config.background;
      modePicker.value = background.mode;
      stopCountRow.hidden = background.mode !== "gradient";
      stopCount.value = String(background.mode === "gradient" ? background.colors.length : 2);
      backgroundColorInputs.forEach((input, index) => {
        const visible = index < background.colors.length;
        input.parentElement.hidden = !visible;
        if (visible) {
          input.value = background.colors[index];
        }
      });
      angleRow.hidden = background.mode !== "gradient";
      backgroundAngle.value = String(background.angle);

      const palette = api.derivePalette(state.config);
      for (const [key, control] of Object.entries(state.colorControls)) {
        const value = state.config.colors[key];
        control.auto.checked = value === undefined;
        control.picker.disabled = value === undefined;
        control.picker.value = value || palette[`--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`];
      }
      const headerLeftGradient = state.config.gradients.headerLeft;
      const headerLeftColor = state.config.colors.headerLeftBackground;
      const headerLeftAutoState = !headerLeftGradient && headerLeftColor === undefined;
      headerLeftAuto.checked = headerLeftAutoState;
      headerLeftMode.value = headerLeftGradient || headerLeftAutoState ? "gradient" : "solid";
      headerLeftMode.disabled = headerLeftAutoState;
      headerLeftStart.disabled = headerLeftAutoState;
      headerLeftEnd.disabled = headerLeftAutoState || headerLeftMode.value !== "gradient";
      headerLeftEndRow.hidden = headerLeftMode.value !== "gradient";
      headerLeftStart.value =
        headerLeftGradient?.colors[0] || headerLeftColor || palette["--theme-header-left-start"];
      headerLeftEnd.value =
        headerLeftGradient?.colors[1] || palette["--theme-header-left-end"];
      for (const [key, control] of Object.entries(state.gradientControls)) {
        const gradient = state.config.gradients[key];
        control.enabled.checked = Boolean(gradient);
        control.colors.forEach((input, index) => {
          input.parentElement.hidden = !gradient;
          if (gradient) {
            input.value = gradient.colors[index] || gradient.colors[0];
          }
        });
        control.angle.parentElement.hidden = !gradient;
        control.angle.value = String(gradient?.angle ?? 135);
      }

      if (state.selectedSelector) {
        const rule = ruleColors(state.selectedSelector);
        selectorName.textContent = state.selectedSelector;
        for (const [key, control] of Object.entries(popupControls)) {
          control.auto.checked = rule[key] === undefined;
          control.picker.disabled = rule[key] === undefined;
          control.picker.value = rule[key] || palette["--theme-primary-text"];
        }
      }
    };

    const stopPicking = () => {
      state.pickMode = false;
      pickMode.setAttribute("aria-pressed", "false");
      pickMode.textContent = "Click to pick an element";
    };
    pickMode.addEventListener("click", () => {
      state.pickMode = !state.pickMode;
      pickMode.setAttribute("aria-pressed", String(state.pickMode));
      pickMode.textContent = state.pickMode ? "Click an element…" : "Click to pick an element";
    });

    document.addEventListener(
      "click",
      (event) => {
        if (!state.pickMode || !(event.target instanceof Element)) {
          return;
        }
        if (event.target.closest("#slt-theme-button, #slt-theme-panel, #slt-element-popup")) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const element = event.target;
        const selector = makeStableSelector(element);
        state.selectedSelector = selector;
        const hashed = [...element.classList].some(isHashedClass);
        warning.hidden = !hashed;
        popup.hidden = false;
        state.renderControls();
        if (hashed) {
          console.warn(`[Slippi Theme] Selector ${JSON.stringify(selector)} contains a hashed class and may break after an update.`);
        }
        stopPicking();
      },
      true,
    );

    button.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
    });
    close.addEventListener("click", () => {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });

    document.body.append(button, panel, popup);
    state.button = button;
    state.panel = panel;
    state.popup = popup;
    state.renderControls();
  };

  function isHashedClass(className) {
    return (
      /^[A-Za-z0-9_-]{16,}$/.test(className) &&
      /[A-Z]/.test(className) &&
      /[a-z]/.test(className) &&
      (/\d/.test(className) || !/[-_]/.test(className))
    );
  }

  function makeStableSelector(element) {
    const nodeSelector = (node) => {
      const tag = node.tagName.toLowerCase();
      const id = node.getAttribute("id");
      if (id && !id.startsWith("slt-")) {
        return `${tag}[id=${JSON.stringify(id)}]`;
      }
      for (const name of ["data-testid", "aria-label", "title", "href", "role"]) {
        const value = node.getAttribute(name);
        if (value) {
          return `${tag}[${name}=${JSON.stringify(value)}]`;
        }
      }
      const classes = [...node.classList].filter((name) => !name.startsWith("slt-"));
      if (classes.length > 0) {
        return `${tag}${classes.map((name) => `[class~=${JSON.stringify(name)}]`).join("")}`;
      }
      return tag;
    };
    const selector = nodeSelector(element);
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }

    let node = element;
    const parts = [];
    while (node && node !== document.documentElement && parts.length < 5) {
      let part = nodeSelector(node);
      if (node.parentElement && document.querySelectorAll(part).length > 1) {
        const siblings = [...node.parentElement.children].filter((sibling) => sibling.tagName === node.tagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      const selector = parts.join(" > ");
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
      node = node.parentElement;
    }
    return nodeSelector(element);
  }

  window.__SLIPPI_THEME_STATE__ = state;
  window.__SLIPPI_THEME_APPLY__ = () => {
    if (!document.documentElement) {
      return;
    }
    let style = document.getElementById("slippi-external-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "slippi-external-theme";
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== state.themeCss) {
      style.textContent = state.themeCss;
    }
    let editorStyle = document.getElementById("slt-editor-style");
    if (!editorStyle) {
      editorStyle = document.createElement("style");
      editorStyle.id = "slt-editor-style";
      (document.head || document.documentElement).appendChild(editorStyle);
    }
    if (editorStyle.textContent !== state.editorCss) {
      editorStyle.textContent = state.editorCss;
    }
    let runtimeStyle = document.getElementById("slt-runtime-overrides");
    if (!runtimeStyle) {
      runtimeStyle = document.createElement("style");
      runtimeStyle.id = "slt-runtime-overrides";
      (document.head || document.documentElement).appendChild(runtimeStyle);
    }
    state.applyConfig(state.config);
    state.createEditor();
    state.renderControls?.();
  };

  if (document.documentElement) {
    window.__SLIPPI_THEME_APPLY__();
  } else {
    document.addEventListener("DOMContentLoaded", window.__SLIPPI_THEME_APPLY__, { once: true });
  }

  if (!window.__SLIPPI_THEME_OBSERVER__ && document.documentElement) {
    let refreshPending = false;
    window.__SLIPPI_THEME_OBSERVER__ = new MutationObserver(() => {
      if (refreshPending) {
        return;
      }
      refreshPending = true;
      requestAnimationFrame(() => {
        refreshPending = false;
        state.discoverHeaderTargets();
        state.refreshMUIOverrides();
        state.applyElementRules();
        state.logUnmatchedControls();
        state.createEditor();
      });
    });
    window.__SLIPPI_THEME_OBSERVER__.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
