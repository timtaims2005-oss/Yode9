---
name: Yode9 OpenAPI expansion
description: State of the openapi.yaml documentation project for github.com/timtaims2005-oss/Yode9
---

## Summary
Expanded `/lib/api-spec/openapi.yaml` from ~1404 lines / 34 paths to ~10958 lines / 297 paths / 333 operationIds across 10 commit batches.

## Work location
- Repo cloned (shallow HTTPS) at `/tmp/yode9` — this is **ephemeral**, not the Replit workspace.
- The Replit workspace repo at `/home/runner/workspace` is unrelated.

## Push situation
- `gitPush` callback returns `NO_CREDENTIALS` — user must connect their GitHub account in Replit (Settings → Git).
- Once credentials are connected, run `gitPush({})` in CodeExecution, or `cd /tmp/yode9 && git push origin main` via ShellExec (if the clone persists).

## Commits made (newest first)
1. Add missing schemas (Memory, ScheduledTask, TrainingJob) + security schemes (AdminSecret, InternalAuth)
2. Batch 9+10 — AI engine, AI tools, Custom GPTs, Cloud chats, Monitoring, Browser, Shell, Execute, Files, Git, Ollama, Local engines, LB, Claude code, Auth extended, Darkweb, Providers (75+ endpoints)
3. Batch 8 — Agent, Agent-v2, Autonomous agent, Swarm, Agent memory (35 endpoints)
4. Batch 7 — Training, Finetune, Reports, Scheduled, Personal keys (30 endpoints)
5. Batch 5+6 — OSINT, Code scan, Security, Threat intel, Blog, Features, Context, Plugins, A/B tests, Collab (51 endpoints)
6. Batch 4 — Notifications, Referrals, Organizations, Developer keys, Webhooks (26 endpoints)
7. Batch 3 — Analytics, Admin extended, Memory, RAG, Vector (32 endpoints)
8. Batch 2 — Chat extended, Council, Godmode, TTS, Image, Vision, CISA (22 endpoints)
9. Batch 1 — Stripe, Invoices, Billing (13 endpoints)

## Remaining undocumented routes (~105 endpoints)
From route files not yet fully covered (based on grep counts):
- `osint-intel.ts` — ~19 endpoints (osint-intel prefix: status, detect, ip/:ip, domain/:domain, hash/:hash, url, credentials, darkweb/mentions, telegram/monitor, telegram/channel/:username, paste/monitor, blockchain/:address, blockchain/trace, threat/ioc, threat/ransomware, threat/actors, censys/search, search/elastic, search)
- `darkweb-intelligence.ts` — remaining endpoints not yet documented: darkweb/scrape, darkweb/monitor/telegram, darkweb/monitor/paste, blockchain/monitor, threat/ioc/:ioc, threat/actor/:actor, threat/classify, threat/alert, network/scada, network/webcams, network/databases, network/rdp, network/iot
- `swarm-agent.ts` — swarm/self-improve, swarm/autonomous, swarm/glm5-status, swarm/models
- `agent4.ts` — agent4/parallel, agent4/deploy, agent4/autofix, agent4/collaborate, agent4/integrate, agent4/websearch
- `scan/asn`, `scan/threatfeed` from osint-advanced.ts
- `ollama/ps`, `ollama/show/:model`, `ollama/generate`, `ollama/start` from ollama.ts
- `local-engines/install/:id`, `local-engines/pull-model` (already done), `local-engines/model/:model` (delete), `local-engines/guide/:id`
- `lb/benchmark` from load-balancer.ts
- `blockchain/tx/:hash`, `blockchain/monitor` from darkweb routes
- Various remaining from: `mux.ts`, miscellaneous routes

## Code review result
All clear — no duplicate operationIds, no missing schema refs, no missing tag refs. Indentation and structure consistent.

**Why this file pattern:**
Any future work on this YAML should append to the paths section at the end of the file. Validate with:
`node -e "const c=require('fs').readFileSync('/tmp/yode9/lib/api-spec/openapi.yaml','utf8'); const ops=c.match(/operationId: \\S+/g)||[]; const set=new Set(); const dups=[]; for(const op of ops){const id=op.split(': ')[1]; if(set.has(id))dups.push(id); set.add(id);} console.log('Ops:',ops.length,'Dups:',dups.length?dups.join(','):'none')"`
