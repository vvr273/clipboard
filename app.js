import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const FIREBASE_CONFIG = window.CLIPDROP_CONFIG?.firebase || {};

const CODE_LENGTH = 6;
const EXPIRY_HOURS = 24;

const els = {
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
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

let db = null;

function hasFirebaseConfig() {
  return Object.values(FIREBASE_CONFIG).every((value) => value && value !== "REPLACE_ME");
}

function initFirebase() {
  if (!hasFirebaseConfig()) {
    setStatus(
      els.sendStatus,
      "Add your Firebase config in app.js to enable online sharing.",
      "error",
    );
    setStatus(
      els.receiveStatus,
      "Add your Firebase config in app.js to enable retrieval.",
      "error",
    );
    return;
  }

  const app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
}

function setStatus(element, message, tone = "") {
  element.textContent = message;
  element.className = "status";

  if (tone === "success") {
    element.classList.add("is-success");
  }

  if (tone === "error") {
    element.classList.add("is-error");
  }
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? label : button.dataset.defaultLabel;
}

function showPanel(panelId) {
  els.tabButtons.forEach((button) => {
    const active = button.dataset.panel === panelId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === panelId);
  });
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function expiryDate() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + EXPIRY_HOURS);
  return expiry.toISOString();
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

async function sendClip() {
  const text = els.clipText.value.trim();

  if (!text) {
    setStatus(els.sendStatus, "Paste some text before sending.", "error");
    return;
  }

  if (!db) {
    setStatus(els.sendStatus, "Firebase is not configured yet.", "error");
    return;
  }

  setLoading(els.sendButton, true, "Sending...");
  els.shareResult.classList.add("hidden");
  setStatus(els.sendStatus, "Uploading text...", "");

  try {
    let code = "";
    let attempts = 0;
    let available = false;

    while (attempts < 5) {
      code = makeCode();
      const existing = await getDoc(doc(db, "clips", code));

      if (!existing.exists()) {
        available = true;
        break;
      }

      attempts += 1;
    }

    if (!available) {
      throw new Error("Could not find an unused code.");
    }

    await setDoc(doc(db, "clips", code), {
      text,
      createdAt: serverTimestamp(),
      expiresAt: expiryDate(),
    });

    els.shareCode.textContent = code;
    els.shareResult.classList.remove("hidden");
    setStatus(els.sendStatus, "Clipboard saved. Share the code.", "success");
  } catch (error) {
    setStatus(els.sendStatus, "Could not send the text. Check Firebase setup.", "error");
  } finally {
    setLoading(els.sendButton, false);
  }
}

function isExpired(payload) {
  if (!payload?.expiresAt) {
    return false;
  }

  return new Date(payload.expiresAt).getTime() < Date.now();
}

async function retrieveClip() {
  const code = els.receiveCode.value.trim().toUpperCase();

  if (code.length !== CODE_LENGTH) {
    setStatus(els.receiveStatus, "Enter the 6-character code.", "error");
    return;
  }

  if (!db) {
    setStatus(els.receiveStatus, "Firebase is not configured yet.", "error");
    return;
  }

  setLoading(els.retrieveButton, true, "Loading...");
  els.retrievedResult.classList.add("hidden");
  setStatus(els.receiveStatus, "Looking up the code...", "");

  try {
    const snapshot = await getDoc(doc(db, "clips", code));

    if (!snapshot.exists()) {
      setStatus(els.receiveStatus, "Code not found.", "error");
      return;
    }

    const payload = snapshot.data();

    if (isExpired(payload)) {
      setStatus(els.receiveStatus, "This code has expired.", "error");
      return;
    }

    els.retrievedText.value = payload.text || "";
    els.retrievedResult.classList.remove("hidden");
    setStatus(els.receiveStatus, "Text retrieved.", "success");
  } catch (error) {
    setStatus(els.receiveStatus, "Could not retrieve the text.", "error");
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
initFirebase();
