const START_TS = Math.floor(Date.now() / 1000);
let lastHref = location.href;
let pollingTimer = null;

function routeToActivity(pathname) {
  const path = pathname.toLowerCase();

  if (path.includes("/machines")) {
    return { details: "Working on Machines", state: readableSegment(pathname) };
  }
  if (path.includes("/challenges")) {
    return { details: "Solving Challenges", state: readableSegment(pathname) };
  }
  if (path.includes("/fortresses")) {
    return { details: "Exploring Fortresses", state: readableSegment(pathname) };
  }
  if (path.includes("/endgames")) {
    return { details: "Playing Endgames", state: readableSegment(pathname) };
  }
  if (path.includes("/prolabs")) {
    return { details: "Inside Pro Labs", state: readableSegment(pathname) };
  }
  if (path.includes("/sherlocks")) {
    return { details: "Investigating Sherlocks", state: readableSegment(pathname) };
  }
  if (path.includes("/academy")) {
    return { details: "Learning in Academy", state: readableSegment(pathname) };
  }
  if (path.includes("/battlegrounds")) {
    return { details: "In Battlegrounds", state: readableSegment(pathname) };
  }

  return {
    details: "Browsing Hack The Box",
    state: document.title || "On platform"
  };
}

function readableSegment(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) {
    return "Dashboard";
  }

  const important = parts.slice(-2).join("/");
  return important
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function emitPresence() {
  const { details, state } = routeToActivity(location.pathname);
  browser.runtime.sendMessage({
    source: "htb-content",
    type: "presence-update",
    payload: {
      details,
      state,
      startTimestamp: START_TS
    }
  });
}

function maybeRouteChanged() {
  if (location.href !== lastHref) {
    lastHref = location.href;
    emitPresence();
  }
}

async function startPolling() {
  try {
    const cfg = await browser.storage.local.get({ pollingSeconds: 20 });
    const seconds = Math.min(120, Math.max(10, Number(cfg.pollingSeconds || 20)));
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    pollingTimer = setInterval(emitPresence, seconds * 1000);
  } catch (_err) {
    pollingTimer = setInterval(emitPresence, 20000);
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pollingSeconds) {
    startPolling();
  }
});

const observer = new MutationObserver(maybeRouteChanged);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

window.addEventListener("popstate", emitPresence);
window.addEventListener("hashchange", emitPresence);
window.addEventListener("beforeunload", () => {
  browser.runtime.sendMessage({ source: "htb-content", type: "presence-clear" });
});

emitPresence();
startPolling();
