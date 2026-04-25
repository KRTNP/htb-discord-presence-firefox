const DEFAULTS = {
  enabled: true,
  discordClientId: "",
  largeImageKey: "",
  largeImageText: "Hack The Box",
  pollingSeconds: 20
};

const NATIVE_APP = "com.htb.discord.presence";
let nativePort = null;
let reconnectTimer = null;
let lastPayloadHash = "";

function log(...args) {
  console.log("[HTB Presence]", ...args);
}

function hashPayload(payload) {
  return JSON.stringify(payload);
}

function ensureNativePort() {
  if (nativePort) {
    return nativePort;
  }

  try {
    nativePort = browser.runtime.connectNative(NATIVE_APP);
    nativePort.onMessage.addListener((msg) => {
      if (msg && msg.type === "error") {
        log("Native host error:", msg.message || msg);
      }
    });

    nativePort.onDisconnect.addListener(() => {
      const err = browser.runtime.lastError;
      if (err) {
        log("Native host disconnected:", err.message);
      }
      nativePort = null;
      scheduleReconnect();
    });

    log("Connected to native host");
  } catch (err) {
    log("Failed to connect native host:", err);
    scheduleReconnect();
  }

  return nativePort;
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureNativePort();
  }, 5000);
}

async function getSettings() {
  const raw = await browser.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...raw };
}

async function forwardPresence(update) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.discordClientId) {
    return;
  }

  const payload = {
    command: "update",
    discordClientId: settings.discordClientId,
    largeImageKey: settings.largeImageKey,
    largeImageText: settings.largeImageText,
    details: update.details,
    state: update.state,
    startTimestamp: update.startTimestamp
  };

  const currentHash = hashPayload(payload);
  if (currentHash === lastPayloadHash) {
    return;
  }

  const port = ensureNativePort();
  if (!port) {
    return;
  }

  try {
    port.postMessage(payload);
    lastPayloadHash = currentHash;
  } catch (err) {
    log("Failed sending payload:", err);
    nativePort = null;
    scheduleReconnect();
  }
}

async function clearPresence() {
  lastPayloadHash = "";
  const settings = await getSettings();
  if (!settings.discordClientId) {
    return;
  }
  const port = ensureNativePort();
  if (!port) {
    return;
  }
  try {
    port.postMessage({
      command: "clear",
      discordClientId: settings.discordClientId
    });
  } catch (err) {
    log("Failed clearing presence:", err);
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.source !== "htb-content") {
    return;
  }

  if (message.type === "presence-update") {
    forwardPresence(message.payload).catch((err) => log("update error", err));
  }

  if (message.type === "presence-clear") {
    clearPresence().catch((err) => log("clear error", err));
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }

  if (changes.discordClientId || changes.enabled) {
    lastPayloadHash = "";
    if (nativePort) {
      try {
        nativePort.disconnect();
      } catch (_err) {
      }
      nativePort = null;
    }
    ensureNativePort();
  }
});

ensureNativePort();
