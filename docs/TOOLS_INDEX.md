# MR7.AI — دليل الأدوات والأنظمة الشاملة

## ملخص كامل لجميع الملفات المُنشأة

---

## من Net_hacke.md — ملفات البنية التحتية

| الملف | الوصف |
|-------|-------|
| `lib/ai-providers.ts` | نظام موحد لموفري الذكاء الاصطناعي |
| `lib/ai-security-guard.ts` | طبقة أمان AI — فحص الـ Prompt Injection |
| `lib/ai-streaming.ts` | دفق SSE المحسّن لردود الذكاء الاصطناعي |
| `lib/ai-cache.ts` | نظام التخزين المؤقت الذكي للردود |
| `lib/ai-integration-index.ts` | مؤشر التصدير الموحد |
| `server/routes/ai-tools.ts` | مسارات أدوات AI (server/) |
| `artifacts/api-server/src/routes/ai-tools.ts` | مسارات أدوات AI (API Server الرئيسي) |
| `migrations/009_ai_optimized_schema.sql` | مخطط قاعدة البيانات المحسّن |
| `migrations/clickhouse-ai-analytics.sql` | تحليلات ClickHouse لبيانات AI |
| `infrastructure/docker/docker-compose.ai-inference.yml` | vLLM + TGI + Ollama |
| `infrastructure/docker/docker-compose.security.yml` | Suricata + Vault + WAF |
| `infrastructure/docker/docker-compose.monitoring.yml` | Prometheus + Grafana + Loki + Jaeger |
| `infrastructure/monitoring/prometheus/prometheus.yml` | إعدادات Prometheus |
| `infrastructure/monitoring/prometheus/alerts/ai-alerts.yml` | قواعد التنبيه |
| `infrastructure/monitoring/alertmanager/alertmanager.yml` | Alertmanager |
| `infrastructure/monitoring/grafana/dashboards/mr7-ai-overview.json` | لوحة Grafana |
| `infrastructure/security/suricata-ai.yaml` | إعدادات Suricata IDS |
| `infrastructure/security/ai-prompt-injection.rules` | قواعد Suricata لـ AI |
| `infrastructure/nginx-ai-loadbalancer.conf` | Nginx Load Balancer |
| `infrastructure/tensorrt-config.json` | إعدادات TensorRT-LLM |
| `infrastructure/redis-ai-cache.conf` | إعدادات Redis Cache |
| `infrastructure/databases/postgresql-ai.conf` | تحسين PostgreSQL |
| `k8s/ai-deployment.yaml` | Kubernetes كامل مع HPA + Ingress |
| `Dockerfile.ai-production` | Docker متعدد المراحل للإنتاج |
| `terraform/main.tf` | AWS Infrastructure كـ Code |
| `ansible/playbook.yml` | Ansible Playbook كامل |
| `scripts/tune-performance.sh` | ضبط أداء النظام |
| `scripts/setup-ai-infrastructure.sh` | إعداد البنية التحتية |
| `AI_CYBERSECURITY_TOOLS.md` | توثيق الأدوات |
| `docs/INFRASTRUCTURE_TOOLS.md` | توثيق البنية التحتية |

---

## من Worm_tools.md — OMNIX ABSOLUTE

| الملف | الوصف |
|-------|-------|
| `artifacts/mr7-ai/src/lib/OmnixAbsoluteUnified.ts` | **ملف موحد شامل** — 7 أنظمة + Hook |
| `artifacts/mr7-ai/src/lib/OmnixAbsoluteCore.ts` | النواة الرئيسية (موجود) |
| `artifacts/mr7-ai/src/lib/OmnixAbsoluteRegistry.ts` | قاموس الأوامر (موجود) |
| `artifacts/mr7-ai/src/lib/OmnixMemory.ts` | الذاكرة الأبدية (موجود) |
| `artifacts/mr7-ai/src/lib/OmnixSovereign.ts` | الخريطة الحية (موجود) |
| `artifacts/mr7-ai/src/lib/OmnixVoiceGesture.ts` | الأوامر الصوتية (موجود) |
| `artifacts/mr7-ai/src/lib/OmnixSelfEvolution.ts` | التطور الذاتي (موجود) |
| `artifacts/mr7-ai/src/lib/OmnixExecutor.ts` | المنفذ الفوري (موجود) |

### الأنظمة السبعة في OMNIX ABSOLUTE:
1. **OmnixSovereign** — خريطة المشروع الحية (تتبع كل مكون في الوقت الفعلي)
2. **OmnixAbsoluteRegistry** — قاموس الأوامر (تسجيل وتنفيذ الأوامر)
3. **OmnixMemory** — الذاكرة الأبدية (IndexedDB + أنماط الاستخدام)
4. **OmnixQuantumInterceptor** — اعتراض الرسائل (حقن السياق في الطلبات)
5. **OmnixInstantExecutor** — المنفذ الفوري (تسلسل الأوامر مع retry)
6. **OmnixVoiceGesture** — الأوامر الصوتية والنصية (ثنائي اللغة ع/إ)
7. **OmnixSelfEvolution** — التطور الذاتي (اقتراح aliases تلقائياً)

---

## من OSINT_Hub.md — صفحة OSINT

| الملف | الوصف |
|-------|-------|
| `hf-spaces/osint-hub.html` | صفحة HTML كاملة لدليل أدوات OSINT |

### الأقسام في OSINT Hub:
- أنظمة البحث المتقدمة (Maltego, SpiderFoot, theHarvester, Sherlock...)
- قواعد البيانات (HaveIBeenPwned, IntelX, Shodan, Censys, VirusTotal...)
- أدوات تحليل الهاتف (Truecaller, PhoneInfoga, NumLookup...)
- أدوات البريد الإلكتروني (Hunter.io, Holehe, Emailrep...)
- البحث بالاسم (WhatsMyName, Namechk, Maigret...)
- أطر العمل الكاملة (Metasploit, Burp Suite, SQLMap, Nmap...)
- جمع المعلومات (Amass, Subfinder, Masscan, DNSdumpster...)

---

## من Accounthacke_TOOLS.md + PENTEST_TOOLS.md

هذه الملفات توثق أدوات للاستخدام القانوني والأخلاقي في:
- Bug Bounty Programs
- Penetration Testing المصرح به
- Red Team Operations رسمية
- Security Research أكاديمي

---

## API Routes الجديدة (`/api/ai-tools/*`)

| الطريق | الوصف |
|--------|-------|
| `GET /api/ai-tools/health` | فحص صحة نظام AI Tools |
| `GET /api/ai-tools/providers` | قائمة موفري AI المتاحين |
| `GET /api/ai-tools/models` | قائمة كل النماذج |
| `POST /api/ai-tools/scan` | فحص الرسائل للـ Prompt Injection |
| `POST /api/ai-tools/sanitize` | تعقيم مخرجات AI |
| `POST /api/ai-tools/cache/lookup` | البحث في الكاش |
| `POST /api/ai-tools/cache/store` | حفظ في الكاش |
| `GET /api/ai-tools/cache/stats` | إحصائيات الكاش |
| `DELETE /api/ai-tools/cache` | مسح الكاش |
| `POST /api/ai-tools/validate` | التحقق من صحة الطلب |
