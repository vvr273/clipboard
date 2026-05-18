const CODE_LENGTH = 6;
const DEFAULT_THEME_COLOR = "#ef6c33";

const els = {
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  panelStage: document.querySelector(".panel-stage"),
  tabRow: document.querySelector(".tab-row"),
  tabIndicator: document.querySelector(".tab-indicator"),
  themeColorInput: document.querySelector("#theme-color-input"),
  clipText: document.querySelector("#clip-text"),
  pasteButton: document.querySelector("#paste-button"),
  sendButton: document.querySelector("#send-button"),
  sendStatus: document.querySelector("#send-status"),
  shareResult: document.querySelector("#share-result"),
  shareCode: document.querySelector("#share-code"),
  copyCodeButton: document.querySelector("#copy-code-button"),
  receiveCode: document.querySelector("#receive-code"),
  retrieveButton: document.querySelector("#retrieve-button"),
  receiveStatus: document.querySelector("#receive-status"),
  retrievedResult: document.querySelector("#retrieved-result"),
  retrievedText: document.querySelector("#retrieved-text"),
  copyTextButton: document.querySelector("#copy-text-button"),
};

function setStatus(element, message, tone = "") {
  element.textContent = message;
  element.className = "status";
  element.classList.toggle("has-message", Boolean(message));

  if (tone === "success") {
    element.classList.add("is-success");
  }

  if (tone === "error") {
    element.classList.add("is-error");
  }
}

function setResultCardVisibility(element, isVisible) {
  element.classList.toggle("hidden", false);
  element.classList.toggle("is-visible", isVisible);
  requestAnimationFrame(syncPanelStageHeight);
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? label : button.dataset.defaultLabel;
}

function showPanel(panelId) {
  const nextButton = els.tabButtons.find((button) => button.dataset.panel === panelId);

  if (!nextButton || nextButton.classList.contains("is-active")) {
    return;
  }

  els.tabButtons.forEach((button) => {
    const active = button.dataset.panel === panelId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === panelId);
  });

  els.panelStage.dataset.activePanel = panelId;
  syncTabIndicator();
  syncPanelStageHeight();
}

function syncTabIndicator() {
  const activeButton = els.tabButtons.find((button) => button.classList.contains("is-active"));

  if (!activeButton || !els.tabIndicator || !els.tabRow) {
    return;
  }

  const rowRect = els.tabRow.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();
  const x = buttonRect.left - rowRect.left;

  els.tabIndicator.style.width = `${buttonRect.width}px`;
  els.tabIndicator.style.transform = `translate3d(${x}px, 0, 0)`;
}

function syncPanelStageHeight() {
  const activePanel = els.tabPanels.find((panel) => panel.classList.contains("is-active"));

  if (!activePanel || !els.panelStage) {
    return;
  }

  els.panelStage.style.height = `${activePanel.scrollHeight + 22}px`;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  const int = parseInt(value, 16);

  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function mixRgb(colorA, colorB, ratio) {
  return {
    r: Math.round(colorA.r * (1 - ratio) + colorB.r * ratio),
    g: Math.round(colorA.g * (1 - ratio) + colorB.g * ratio),
    b: Math.round(colorA.b * (1 - ratio) + colorB.b * ratio),
  };
}

function rgbaString(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function rgbString(rgb) {
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function getLuminance({ r, g, b }) {
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function applyTheme(hexColor) {
  const accent = hexToRgb(hexColor);
  const white = { r: 255, g: 255, b: 255 };
  const dark = { r: 24, g: 23, b: 28 };
  const deepInk = { r: 28, g: 27, b: 36 };
  const softInk = { r: 94, g: 92, b: 109 };
  const lightBg = mixRgb(accent, white, 0.9);
  const bgEnd = mixRgb(accent, white, 0.82);
  const accentDeep = mixRgb(accent, dark, 0.28);
  const accentSoft = mixRgb(accent, white, 0.72);
  const surfaceTone = mixRgb(accent, white, 0.94);
  const bgIsLight = getLuminance(lightBg) > 0.64;
  const text = bgIsLight ? rgbToHex(deepInk) : "#fffaf6";
  const muted = bgIsLight ? rgbToHex(softInk) : "rgba(255, 250, 246, 0.82)";
  const line = bgIsLight ? "rgba(255, 255, 255, 0.34)" : "rgba(255, 255, 255, 0.22)";
  const surface = bgIsLight ? rgbaString(white, 0.42) : rgbaString(surfaceTone, 0.34);
  const surfaceStrong = bgIsLight ? rgbaString(white, 0.72) : rgbaString(surfaceTone, 0.56);
  const mutedButtonBg = bgIsLight ? rgbaString(white, 0.34) : rgbaString(surfaceTone, 0.3);
  const pickerText = bgIsLight ? text : "#fffaf6";
  const accentTitle = bgIsLight ? rgbToHex(accentDeep) : rgbToHex(mixRgb(accent, white, 0.32));

  document.body.style.setProperty("--bg", rgbToHex(lightBg));
  document.body.style.setProperty("--bg-end", rgbToHex(bgEnd));
  document.body.style.setProperty("--surface", surface);
  document.body.style.setProperty("--surface-strong", surfaceStrong);
  document.body.style.setProperty("--text", text);
  document.body.style.setProperty("--muted", muted);
  document.body.style.setProperty("--line", line);
  document.body.style.setProperty("--accent", hexColor);
  document.body.style.setProperty("--accent-deep", accentTitle);
  document.body.style.setProperty("--accent-soft", rgbToHex(accentSoft));
  document.body.style.setProperty("--accent-rgb", rgbString(accent));
  document.body.style.setProperty("--accent-soft-rgb", rgbString(accentSoft));
  document.body.style.setProperty("--glow-a", rgbaString(accent, 0.28));
  document.body.style.setProperty("--glow-b", rgbaString(accentSoft, 0.42));
  document.body.style.setProperty("--glow-c", rgbaString(white, 0.34));
  document.body.style.setProperty("--shadow", `0 30px 80px rgba(${accentDeep.r}, ${accentDeep.g}, ${accentDeep.b}, 0.16)`);
  document.body.style.setProperty("--tab-shell-top", rgbaString(white, 0.38));
  document.body.style.setProperty("--tab-shell-bottom", rgbaString(accentSoft, 0.18));
  document.body.style.setProperty("--tab-indicator-top", rgbaString(white, 0.92));
  document.body.style.setProperty("--tab-indicator-mid", rgbaString(mixRgb(accentSoft, white, 0.35), 0.66));
  document.body.style.setProperty("--tab-indicator-bottom", rgbaString(accentSoft, 0.78));
  document.body.style.setProperty("--tab-indicator-shadow", rgbaString(accentDeep, 0.16));
  document.body.style.setProperty("--tab-indicator-glow", rgbaString(accentSoft, 0.48));
  document.body.style.setProperty("--button-muted-bg", mutedButtonBg);
  document.body.style.setProperty("--button-primary-top", rgbToHex(mixRgb(accent, white, 0.18)));
  document.body.style.setProperty("--button-primary-bottom", hexColor);
  document.body.style.setProperty("--button-primary-top-hover", rgbToHex(mixRgb(accent, white, 0.26)));
  document.body.style.setProperty("--button-primary-bottom-hover", rgbToHex(mixRgb(accent, dark, 0.16)));
  document.body.style.setProperty("--button-primary-text", getLuminance(accent) > 0.55 ? "#102019" : "#fffaf6");
  document.body.style.setProperty("--theme-picker-text", pickerText);

  els.themeColorInput.value = hexColor;
  localStorage.setItem("clipdrop-theme-color", hexColor);
  requestAnimationFrame(syncTabIndicator);
}

function initThemePicker() {
  const savedThemeColor = localStorage.getItem("clipdrop-theme-color") || DEFAULT_THEME_COLOR;
  applyTheme(savedThemeColor);
  els.themeColorInput.addEventListener("input", (event) => applyTheme(event.target.value));
}

async function copyText(value, successMessage) {
  await navigator.clipboard.writeText(value);
  return successMessage;
}

async function pasteIntoSender() {
  try {
    const text = await navigator.clipboard.readText();

    if (!text) {
      setStatus(els.sendStatus, "Clipboard is empty.", "error");
      return;
    }

    els.clipText.value = text;
    setStatus(els.sendStatus, "Pasted from clipboard.", "success");
  } catch (error) {
    setStatus(
      els.sendStatus,
      "Paste is blocked by the browser. Use Ctrl/Cmd+V inside the text box.",
      "error",
    );
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

async function sendClip() {
  const text = els.clipText.value.trim();

  if (!text) {
    setStatus(els.sendStatus, "Paste some text before sending.", "error");
    return;
  }

  setLoading(els.sendButton, true, "Sending...");
  setResultCardVisibility(els.shareResult, false);
  setStatus(els.sendStatus, "Encrypting and uploading text...", "");

  try {
    const payload = await requestJson("/api/clips", {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    els.shareCode.textContent = payload.code;
    setResultCardVisibility(els.shareResult, true);
    setStatus(els.sendStatus, "Clipboard saved. Share the code.", "success");
  } catch (error) {
    setStatus(els.sendStatus, error.message, "error");
  } finally {
    setLoading(els.sendButton, false);
  }
}

async function retrieveClip() {
  const code = els.receiveCode.value.trim().toUpperCase();

  if (code.length !== CODE_LENGTH) {
    setStatus(els.receiveStatus, "Enter the 6-character code.", "error");
    return;
  }

  setLoading(els.retrieveButton, true, "Loading...");
  setResultCardVisibility(els.retrievedResult, false);
  setStatus(els.receiveStatus, "Retrieving text...", "");

  try {
    const payload = await requestJson("/api/clips/retrieve", {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    els.retrievedText.value = payload.text || "";
    setResultCardVisibility(els.retrievedResult, true);
    setStatus(els.receiveStatus, "Text retrieved.", "success");
  } catch (error) {
    setStatus(els.receiveStatus, error.message, "error");
  } finally {
    setLoading(els.retrieveButton, false);
  }
}

function attachEvents() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.panel));
  });

  els.pasteButton.addEventListener("click", pasteIntoSender);
  els.sendButton.addEventListener("click", sendClip);
  els.retrieveButton.addEventListener("click", retrieveClip);

  els.copyCodeButton.addEventListener("click", async () => {
    try {
      const message = await copyText(els.shareCode.textContent, "Code copied.");
      setStatus(els.sendStatus, message, "success");
    } catch (error) {
      setStatus(els.sendStatus, "Could not copy the code.", "error");
    }
  });

  els.copyTextButton.addEventListener("click", async () => {
    try {
      const message = await copyText(els.retrievedText.value, "Text copied.");
      setStatus(els.receiveStatus, message, "success");
    } catch (error) {
      setStatus(els.receiveStatus, "Could not copy the text.", "error");
    }
  });

  els.receiveCode.addEventListener("input", () => {
    els.receiveCode.value = els.receiveCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
}

function primeButtons() {
  [els.sendButton, els.retrieveButton].forEach((button) => {
    button.dataset.defaultLabel = button.textContent;
  });
}

primeButtons();
attachEvents();
initThemePicker();
syncTabIndicator();
syncPanelStageHeight();
window.addEventListener("resize", () => {
  syncTabIndicator();
  syncPanelStageHeight();
});
