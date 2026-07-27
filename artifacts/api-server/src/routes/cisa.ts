import { Router } from "express";
import type { WebSocketServer, WebSocket } from "ws";

const router = Router();

interface KevVuln {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
}

interface KevFeed {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevVuln[];
}

let cache: { data: KevFeed; ts: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

// WebSocket broadcast registry
const wsClients = new Set<WebSocket>();

export function registerCisaWsClient(ws: WebSocket) {
  wsClients.add(ws);
  ws.on("close", () => wsClients.delete(ws));
  ws.on("error", () => wsClients.delete(ws));
  // Send latest snapshot immediately
  if (cache) {
    const latest5 = cache.data.vulnerabilities.slice(0, 5);
    ws.send(JSON.stringify({ type: "snapshot", items: latest5, total: cache.data.count, version: cache.data.catalogVersion }));
  }
}

function broadcast(payload: unknown) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(ws => {
    if (ws.readyState === 1 /* OPEN */) ws.send(msg);
  });
}

let knownCveIds = new Set<string>();

async function fetchFeed(): Promise<KevFeed | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!resp.ok) return null;
    return (await resp.json()) as KevFeed;
  } catch {
    return null;
  }
}

async function pollAndBroadcast() {
  const data = await fetchFeed();
  if (!data) return;

  const prev = cache;
  cache = { data, ts: Date.now() };

  if (prev && knownCveIds.size > 0) {
    const newEntries = data.vulnerabilities.filter(v => !knownCveIds.has(v.cveID));
    if (newEntries.length > 0) {
      broadcast({ type: "new_entries", items: newEntries, total: data.count, version: data.catalogVersion });
    }
  }

  knownCveIds = new Set(data.vulnerabilities.map(v => v.cveID));

  if (!prev) {
    broadcast({ type: "snapshot", items: data.vulnerabilities.slice(0, 5), total: data.count, version: data.catalogVersion });
  }
}

// Poll every 5 minutes for new KEV entries
void pollAndBroadcast();
setInterval(pollAndBroadcast, 5 * 60 * 1000);

const FALLBACK: KevFeed = {
  title: "CISA Known Exploited Vulnerabilities Catalog (offline fallback)",
  catalogVersion: "2024.1",
  dateReleased: "2025-01-01T00:00:00Z",
  count: 20,
  vulnerabilities: [
    { cveID:"CVE-2024-3400",  vendorProject:"Palo Alto Networks", product:"PAN-OS",               vulnerabilityName:"PAN-OS Command Injection Vulnerability",         dateAdded:"2024-04-12", shortDescription:"OS command injection in GlobalProtect",          requiredAction:"Apply updates", dueDate:"2024-04-19", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-21762", vendorProject:"Fortinet",            product:"FortiOS/FortiProxy",   vulnerabilityName:"Fortinet SSL VPN Auth Bypass",                   dateAdded:"2024-02-09", shortDescription:"Unauthenticated RCE via SSL-VPN",                 requiredAction:"Apply updates", dueDate:"2024-02-16", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2023-46805", vendorProject:"Ivanti",              product:"Connect Secure",        vulnerabilityName:"Ivanti Authentication Bypass",                   dateAdded:"2024-01-19", shortDescription:"Auth bypass via path traversal",                  requiredAction:"Apply updates", dueDate:"2024-01-26", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-1709",  vendorProject:"ConnectWise",         product:"ScreenConnect",         vulnerabilityName:"ConnectWise ScreenConnect Auth Bypass",          dateAdded:"2024-02-22", shortDescription:"CWE-288 authentication bypass",                   requiredAction:"Apply updates", dueDate:"2024-02-29", knownRansomwareCampaignUse:"Known",   notes:"" },
    { cveID:"CVE-2024-27198", vendorProject:"JetBrains",           product:"TeamCity",              vulnerabilityName:"JetBrains TeamCity Auth Bypass",                 dateAdded:"2024-03-07", shortDescription:"Authentication bypass via alternative path",      requiredAction:"Apply updates", dueDate:"2024-03-14", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-6387",  vendorProject:"OpenBSD",             product:"OpenSSH",               vulnerabilityName:"OpenSSH RegreSSHion RCE",                        dateAdded:"2024-07-01", shortDescription:"Signal handler race condition in sshd",           requiredAction:"Apply updates", dueDate:"2024-07-08", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-47575", vendorProject:"Fortinet",            product:"FortiManager",          vulnerabilityName:"Fortinet FortiManager Missing Auth",             dateAdded:"2024-10-23", shortDescription:"Missing auth in fgfmsd daemon",                   requiredAction:"Apply updates", dueDate:"2024-10-30", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-40711", vendorProject:"Veeam",               product:"Backup & Replication",  vulnerabilityName:"Veeam Backup Deserialization RCE",               dateAdded:"2024-09-09", shortDescription:"Deserialization of untrusted data",               requiredAction:"Apply updates", dueDate:"2024-09-16", knownRansomwareCampaignUse:"Known",   notes:"" },
    { cveID:"CVE-2023-22527", vendorProject:"Atlassian",           product:"Confluence",            vulnerabilityName:"Atlassian Confluence Server Template Injection", dateAdded:"2024-01-22", shortDescription:"Remote code execution via template injection",    requiredAction:"Apply updates", dueDate:"2024-01-29", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-23897", vendorProject:"Jenkins",             product:"Jenkins Core",          vulnerabilityName:"Jenkins Arbitrary File Read via CLI",            dateAdded:"2024-08-19", shortDescription:"Arbitrary file read leads to RCE",                requiredAction:"Apply updates", dueDate:"2024-08-26", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-28986", vendorProject:"SolarWinds",          product:"Web Help Desk",         vulnerabilityName:"SolarWinds Web Help Desk Java Deserialization",  dateAdded:"2024-08-21", shortDescription:"Java deserialization RCE",                        requiredAction:"Apply updates", dueDate:"2024-08-28", knownRansomwareCampaignUse:"Known",   notes:"" },
    { cveID:"CVE-2024-29824", vendorProject:"Ivanti",              product:"Endpoint Manager",      vulnerabilityName:"Ivanti EPM SQL Injection RCE",                   dateAdded:"2024-09-16", shortDescription:"SQL injection leading to RCE",                    requiredAction:"Apply updates", dueDate:"2024-09-23", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-9463",  vendorProject:"Palo Alto Networks",  product:"Expedition",            vulnerabilityName:"Palo Alto Expedition OS Command Injection",      dateAdded:"2024-11-14", shortDescription:"Unauthenticated OS command injection",           requiredAction:"Apply updates", dueDate:"2024-11-21", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-43468", vendorProject:"Microsoft",           product:"Configuration Manager", vulnerabilityName:"Microsoft ConfigMgr SQL Injection RCE",          dateAdded:"2024-11-12", shortDescription:"SQL injection leads to remote code execution",    requiredAction:"Apply updates", dueDate:"2024-11-19", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-4966",  vendorProject:"Citrix",              product:"NetScaler ADC",         vulnerabilityName:"Citrix NetScaler Session Token Disclosure",      dateAdded:"2023-10-18", shortDescription:"Sensitive info disclosure from buffer",           requiredAction:"Apply updates", dueDate:"2023-10-25", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-20353", vendorProject:"Cisco",               product:"ASA/FTD",               vulnerabilityName:"Cisco ASA/FTD DoS",                             dateAdded:"2024-04-24", shortDescription:"Persistent denial of service",                    requiredAction:"Apply updates", dueDate:"2024-05-01", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-30080", vendorProject:"Microsoft",           product:"MSMQ",                  vulnerabilityName:"Windows MSMQ RCE",                              dateAdded:"2024-11-12", shortDescription:"Remote code execution in MSMQ",                   requiredAction:"Apply updates", dueDate:"2024-11-19", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-10914", vendorProject:"D-Link",              product:"NAS Devices",           vulnerabilityName:"D-Link NAS OS Command Injection",               dateAdded:"2024-11-13", shortDescription:"Unauthenticated OS command injection",           requiredAction:"Apply updates", dueDate:"2024-11-20", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-22024", vendorProject:"Ivanti",              product:"Policy Secure",         vulnerabilityName:"Ivanti Policy Secure XXE Auth Bypass",          dateAdded:"2024-02-27", shortDescription:"XML external entity injection auth bypass",       requiredAction:"Apply updates", dueDate:"2024-03-05", knownRansomwareCampaignUse:"Unknown", notes:"" },
    { cveID:"CVE-2024-11477", vendorProject:"7-Zip",               product:"7-Zip",                 vulnerabilityName:"7-Zip Deserialization Code Execution",           dateAdded:"2024-11-21", shortDescription:"Deserialization of untrusted data RCE",           requiredAction:"Apply updates", dueDate:"2024-11-28", knownRansomwareCampaignUse:"Unknown", notes:"" },
  ],
};

router.get("/cisa-kev", async (_req, res) => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      res.set("X-Cache", "HIT");
      return res.json(cache.data);
    }
    const data = await fetchFeed();
    if (!data) throw new Error("fetch failed");
    cache = { data, ts: Date.now() };
    if (knownCveIds.size === 0) knownCveIds = new Set(data.vulnerabilities.map(v => v.cveID));
    res.set("X-Cache", "MISS");
    return res.json(data);
  } catch {
    res.set("X-Cache", "FALLBACK");
    return res.json(FALLBACK);
  }
});

export { router as cisaRouter };
