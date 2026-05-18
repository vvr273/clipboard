const CODE_LENGTH = 6;

const els = {
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  panelStage: document.querySelector(".panel-stage"),
  tabRow: document.querySelector(".tab-row"),
  tabIndicator: document.querySelector(".tab-indicator"),
  themeSwatches: [...document.querySelectorAll(".theme-swatch")],
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

function applyTheme(themeName) {
  document.body.dataset.theme = themeName;

  els.themeSwatches.forEach((swatch) => {
    const isActive = swatch.dataset.theme === themeName;
    swatch.classList.toggle("is-active", isActive);
    swatch.setAttribute("aria-pressed", String(isActive));
  });

  localStorage.setItem("clipdrop-theme", themeName);
  requestAnimationFrame(syncTabIndicator);
}

function initThemePicker() {
  const savedTheme = localStorage.getItem("clipdrop-theme") || "apricot";
  applyTheme(savedTheme);

  els.themeSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => applyTheme(swatch.dataset.theme));
  });
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
