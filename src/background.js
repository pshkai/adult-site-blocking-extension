const BLOCKLIST_URL =
  "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts";
const UPDATE_ALARM_NAME = "refresh-adult-domain-list";
const MAX_DYNAMIC_RULES = 4500;
const DYNAMIC_RULE_START_ID = 1000;

const FALLBACK_DOMAINS = [
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "redtube.com",
  "youporn.com",
  "tube8.com",
  "spankbang.com",
  "xhamster.com",
  "brazzers.com",
  "onlyfans.com"
];

chrome.runtime.onInstalled.addListener(async () => {
  await refreshBlocklist();
  chrome.alarms.create(UPDATE_ALARM_NAME, { periodInMinutes: 24 * 60 });
});

chrome.runtime.onStartup.addListener(refreshBlocklist);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM_NAME) {
    refreshBlocklist();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "refresh-blocklist") return false;

  refreshBlocklist()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || isExtensionPage(details.url)) return;

  const domains = await getStoredDomains();
  const hostname = getHostname(details.url);
  if (hostname && domainMatches(hostname, domains)) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(hostname)}`)
    });
  }
});

async function refreshBlocklist() {
  let domains = FALLBACK_DOMAINS;

  try {
    const response = await fetch(BLOCKLIST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Blocklist request failed: ${response.status}`);
    domains = parseHostsFile(await response.text());
  } catch (error) {
    console.warn("Using fallback adult-domain list.", error);
  }

  domains = [...new Set([...FALLBACK_DOMAINS, ...domains])]
    .filter(Boolean)
    .slice(0, MAX_DYNAMIC_RULES);

  await chrome.storage.local.set({
    blockedDomains: domains,
    updatedAt: new Date().toISOString()
  });

  await syncDeclarativeRules(domains);
}

function parseHostsFile(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/).at(-1))
    .map(normalizeDomain)
    .filter((domain) => domain && !domain.includes("localhost"));
}

async function getStoredDomains() {
  const { blockedDomains } = await chrome.storage.local.get("blockedDomains");
  return Array.isArray(blockedDomains) && blockedDomains.length
    ? blockedDomains
    : FALLBACK_DOMAINS;
}

async function syncDeclarativeRules(domains) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);
  const addRules = domains.map((domain, index) => ({
    id: DYNAMIC_RULE_START_ID + index,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" }
    },
    condition: {
      requestDomains: [domain],
      resourceTypes: ["main_frame"]
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

function getHostname(url) {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return "";
  }
}

function normalizeDomain(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\*?\./, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9.-]/g, "");
}

function domainMatches(hostname, domains) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function isExtensionPage(url) {
  return url.startsWith(chrome.runtime.getURL(""));
}
