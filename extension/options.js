const DEFAULTS = {
  enabled: true,
  discordClientId: "",
  largeImageKey: "",
  largeImageText: "Hack The Box",
  pollingSeconds: 20
};

async function restore() {
  const cfg = await browser.storage.local.get(DEFAULTS);
  document.getElementById("enabled").checked = cfg.enabled;
  document.getElementById("clientId").value = cfg.discordClientId;
  document.getElementById("imageKey").value = cfg.largeImageKey;
  document.getElementById("imageText").value = cfg.largeImageText;
  document.getElementById("pollingSeconds").value = cfg.pollingSeconds;
}

async function save() {
  const pollingRaw = Number(document.getElementById("pollingSeconds").value || 20);
  const pollingSeconds = Math.min(120, Math.max(10, pollingRaw));

  await browser.storage.local.set({
    enabled: document.getElementById("enabled").checked,
    discordClientId: document.getElementById("clientId").value.trim(),
    largeImageKey: document.getElementById("imageKey").value.trim(),
    largeImageText: document.getElementById("imageText").value.trim() || "Hack The Box",
    pollingSeconds
  });

  const status = document.getElementById("status");
  status.textContent = "Saved.";
  setTimeout(() => {
    status.textContent = "";
  }, 1500);
}

document.getElementById("saveBtn").addEventListener("click", save);
restore();
