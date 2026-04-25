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
let reconnectWanted = false;
let lastPayloadHash = "";
let lastClientId = "";
let activeTabId = null;
let requestSeq = 1;
let refreshChain = Promise.resolve();

const tabPresence = new Map();
const pendingRequests = new Map();

function log(...args) {
  console.log("[HTB Presence]", ...args);
}

function hashPayload(payload) {
  return JSON.stringify(payload);
}

function settleAllPending(reason) {
  for (const [id, pending] of pendingRequests.entries()) {
    clearTimeout(pending.timer);
    pending.reject(new Error(reason));
    pendingRequests.delete(id);
  }
}

function ensureNativePort() {
  if (nativePort) {
    return nativePort;
  }

  try {
    nativePort = browser.runtime.connectNative(NATIVE_APP);
    nativePort.onMessage.addListener((msg) => {
      if (msg && typeof msg.requestId === "number" && pendingRequests.has(msg.requestId)) {
        const pending = pendingRequests.get(msg.requestId);
        pendingRequests.delete(msg.requestId);
        clearTimeout(pending.timer);

        if (msg.type === "error") {
          pending.reject(new Error(msg.message || "Native host error"));
        } else {
          pending.resolve(msg);
        }
        return;
      }

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
      settleAllPending("Native host disconnected");
      if (reconnectWanted) {
        scheduleReconnect();
      }
    });
  } catch (err) {
    log("Failed to connect native host:", err);
    if (reconnectWanted) {
      scheduleReconnect();
    }
  }

  return nativePort;
}

function scheduleReconnect() {
  if (reconnectTimer || !reconnectWanted) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (reconnectWanted) {
      ensureNativePort();
    }
  }, 5000);
}

function stopReconnect() {
  reconnectWanted = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function disconnectNative() {
  if (nativePort) {
    try {
      nativePort.disconnect();
    } catch (_err) {
    }
    nativePort = null;
  }
}

async function getSettings() {
  const raw = await browser.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...raw };
}

function getLatestPresence() {
  let best = null;
  for (const value of tabPresence.values()) {
    if (!best || value.updatedAt > best.updatedAt) {
      best = value;
    }
  }
  return best;
}

function getBestPresence() {
  if (activeTabId != null && tabPresence.has(activeTabId)) {
    return tabPresence.get(activeTabId);
  }
  return getLatestPresence();
}

function postNativeMessage(payload, options = {}) {
  const awaitResponse = Boolean(options.awaitResponse);
  const timeoutMs = options.timeoutMs || 1500;

  const port = ensureNativePort();
  if (!port) {
    return Promise.reject(new Error("Native host not available"));
  }

  try {
    if (!awaitResponse) {
      port.postMessage(payload);
      return Promise.resolve({ type: "sent" });
    }

    const requestId = requestSeq++;
    const message = { ...payload, requestId };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error("Native host response timeout"));
      }, timeoutMs);

      pendingRequests.set(requestId, { resolve, reject, timer });
      port.postMessage(message);
    });
  } catch (err) {
    nativePort = null;
    if (reconnectWanted) {
      scheduleReconnect();
    }
    return Promise.reject(err);
  }
}

function sendUpdateWithSettings(settings, update) {
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

  reconnectWanted = true;
  postNativeMessage(payload)
    .then(() => {
      lastPayloadHash = currentHash;
      lastClientId = settings.discordClientId;
    })
    .catch((err) => log("Failed sending payload:", err));
}

async function clearPresenceWithClientId(clientId) {
  const effectiveClientId = String(clientId || lastClientId || "").trim();
  lastPayloadHash = "";

  if (!effectiveClientId) {
    return;
  }

  reconnectWanted = true;
  await postNativeMessage(
    {
      command: "clear",
      discordClientId: effectiveClientId
    },
    {
      awaitResponse: true,
      timeoutMs: 2000
    }
  );
  lastClientId = effectiveClientId;
}

async function refreshPresence() {
  const settings = await getSettings();

  if (!settings.enabled || !settings.discordClientId) {
    try {
      await clearPresenceWithClientId(settings.discordClientId);
    } catch (err) {
      log("clear before disconnect error", err);
    }
    stopReconnect();
    disconnectNative();
    return;
  }

  const latest = getBestPresence();
  if (!latest) {
    try {
      await clearPresenceWithClientId(settings.discordClientId);
    } catch (err) {
      log("clear before idle disconnect error", err);
    }
    stopReconnect();
    disconnectNative();
    return;
  }

  sendUpdateWithSettings(settings, latest);
}

function queueRefresh() {
  refreshChain = refreshChain
    .then(() => refreshPresence())
    .catch((err) => log("refresh error", err));
  return refreshChain;
}

async function resolveActiveTab() {
  try {
    const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    activeTabId = tabs.length ? tabs[0].id : null;
  } catch (_err) {
    activeTabId = null;
  }
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.source !== "htb-content") {
    return;
  }

  const tabId = sender && sender.tab ? sender.tab.id : null;
  if (tabId == null) {
    return;
  }

  if (sender.tab && sender.tab.active) {
    activeTabId = tabId;
  }

  if (message.type === "presence-update" && message.payload) {
    tabPresence.set(tabId, {
      details: message.payload.details,
      state: message.payload.state,
      startTimestamp: message.payload.startTimestamp,
      updatedAt: Date.now()
    });
    queueRefresh();
  }

  if (message.type === "presence-clear") {
    tabPresence.delete(tabId);
    queueRefresh();
  }
});

browser.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
  queueRefresh();
});

browser.tabs.onRemoved.addListener((tabId) => {
  const removedPresence = tabPresence.delete(tabId);
  if (activeTabId === tabId) {
    activeTabId = null;
    resolveActiveTab().finally(() => queueRefresh());
    return;
  }

  if (removedPresence) {
    queueRefresh();
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }

  if (changes.discordClientId || changes.enabled || changes.largeImageKey || changes.largeImageText) {
    lastPayloadHash = "";
    queueRefresh();
  }
});

resolveActiveTab();
