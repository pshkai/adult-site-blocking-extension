const statusEl = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh");

renderStatus();

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  statusEl.textContent = "Refreshing blocklist...";
  const response = await chrome.runtime.sendMessage({ type: "refresh-blocklist" });
  if (!response?.ok) {
    statusEl.textContent = "Could not refresh. The fallback list is still active.";
  }
  await renderStatus();
  refreshButton.disabled = false;
});

async function renderStatus() {
  const { blockedDomains = [], updatedAt } = await chrome.storage.local.get([
    "blockedDomains",
    "updatedAt"
  ]);

  statusEl.textContent = `${blockedDomains.length} domains loaded${
    updatedAt ? `, updated ${new Date(updatedAt).toLocaleString()}` : ""
  }.`;
}
