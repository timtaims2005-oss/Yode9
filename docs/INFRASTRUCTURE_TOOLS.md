# 🏗️ Infrastructure Tools — Yode9 / MR7.AI
# أدوات البنية التحتية الشاملة

> **الإصدار:** 1.0.0  
> **التاريخ:** 2026-06-30

---

## 📋 جدول المحتويات

1. [مكدس التقنيات](#مكدس-التقنيات)
2. [خدمات Docker](#خدمات-docker)
3. [مراقبة الأداء](#مراقبة-الأداء)
4. [قواعد البيانات](#قواعد-البيانات)
5. [الأمن السيبراني](#الأمن-السيبراني)
6. [سكريبتات التشغيل](#سكريبتات-التشغيل)
7. [الأوامر المرجعية](#الأوامر-المرجعية)

---

## 🛠️ مكدس التقنيات

### AI Layer

```
┌─────────────────────────────────────────────┐
│               AI Request Flow               │
│                                             │
│  User → Security Guard → Cache Check        │
│          ↓                 ↓                │
│      Blocked?           Cache Hit?          │
│          ↓                 ↓                │
│        Reject          Return Cached        │
│                             ↓               │
│                     AI Provider API         │
│                    (OpenAI/Groq/Ollama)     │
│                             ↓               │
│                    Stream Optimizer         │
│                             ↓               │
│                    Output Sanitizer         │
│                             ↓               │
│                    Cache + Return           │
└─────────────────────────────────────────────┘
```

### Infrastructure Stack

| الطبقة | التقنية | الغرض |
|--------|---------|-------|
| **API** | Node.js / Express | REST API & WebSocket |
| **Frontend** | React 19 / Three.js | 3D Holographic UI |
| **DB (Primary)** | PostgreSQL + pgvector | البيانات الرئيسية |
| **Cache** | Redis / In-Memory LRU | التخزين المؤقت |
| **Vector DB** | Qdrant | البحث الدلالي |
| **LLM (Local)** | Ollama | نماذج محلية |
| **Monitoring** | Prometheus + Grafana | المراقبة |
| **Security** | AISecurityGuard | حماية AI |

---

## 🐳 خدمات Docker

### خدمات AI الأساسية

```bash
# تشغيل الخدمات
cd infrastructure && make start

# الخدمات المُشغَّلة:
# - Ollama     → http://localhost:11434
# - Qdrant     → http://localhost:6333
# - Redis      → localhost:6379
```

### خدمات المراقبة

```bash
cd infrastructure && make monitoring-start

# الخدمات المُشغَّلة:
# - Prometheus → http://localhost:9090
# - Grafana    → http://localhost:3001  (admin/admin123)
```

### أوامر Docker المفيدة

```bash
# عرض السجلات
cd infrastructure && make logs

# حالة الخدمات
cd infrastructure && make status

# إعادة التشغيل
cd infrastructure && make restart

# إيقاف وتنظيف
cd infrastructure && make clean
```

---

## 📊 مراقبة الأداء

### Prometheus Metrics

المقاييس المتاحة عبر `/api/ai-tools/health`:

```json
{
  "status": "healthy",
  "providers": {
    "total": 7,
    "available": 3,
    "list": ["openai", "groq", "ollama"]
  },
  "cache": {
    "size": 150,
    "hitRate": "67%"
  }
}
```

### Grafana Dashboards

بعد تشغيل المراقبة، افتح http://localhost:3001 وأضف Datasource لـ Prometheus:
- URL: `http://prometheus:9090`
- Access: Server (Default)

---

## 🗄️ قواعد البيانات

### تطبيق Migration 009

```bash
# مع DATABASE_URL من .env
psql $DATABASE_URL -f migrations/009_ai_optimized_schema.sql

# على Replit (استخدم Replit DB Shell)
```

### الجداول الجديدة

```sql
-- عرض محادثات اليوم
SELECT 
    model_id, model_provider, COUNT(*) as count
FROM ai_conversations 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY model_id, model_provider
ORDER BY count DESC;

-- إحصائيات الأداء
SELECT 
    model_id, provider,
    SUM(request_count) as total_requests,
    AVG(total_latency_ms / NULLIF(request_count, 0)) as avg_latency_ms,
    SUM(error_count) as total_errors
FROM ai_performance_metrics
WHERE date = CURRENT_DATE
GROUP BY model_id, provider;

-- أحداث أمنية اليوم
SELECT 
    event_type, COUNT(*) as count,
    AVG(risk_score) as avg_risk
FROM ai_security_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- تنظيف الكاش المنتهي
SELECT cleanup_expired_ai_cache();
```

### Redis Key Conventions

```
ai:cache:{hash}        → Cached AI responses (TTL: 24h)
ai:rate:{user_id}      → Rate limiting counters (TTL: 60s)
ai:session:{id}        → Active stream sessions
ai:stats:{model}       → Real-time model stats
```

---

## 🔒 الأمن السيبراني

### حماية API Endpoints

```typescript
// تكامل AISecurityGuard في المسارات
import { AISecurityGuard } from '../../lib/ai-security-guard';

// Middleware للحماية التلقائية
app.use('/api/chat', (req, res, next) => {
  const scan = AISecurityGuard.scanInput(req.body.message);
  if (!scan.isSafe) {
    return res.status(400).json({ 
      error: 'Security check failed',
      riskScore: scan.riskScore 
    });
  }
  req.body.message = scan.sanitized;
  next();
});
```

### Suricata Rules للـ AI (مرجعي)

```bash
# الأنماط المكتشفة:
# - Prompt injection في HTTP requests
# - تسريب API keys في الردود
# - طلبات مشبوهة متكررة
```

### قائمة التحقق الأمنية

- [x] فحص Prompt Injection في AISecurityGuard
- [x] تنظيف مخرجات النموذج من secrets
- [x] Rate limiting للطلبات
- [x] تسجيل الأحداث الأمنية في DB
- [x] تشفير مفاتيح API في متغيرات البيئة
- [ ] WAF ModSecurity (للإنتاج)
- [ ] Suricata IDS (للإنتاج)
- [ ] TLS 1.3 على جميع النقاط (للإنتاج)

---

## 📜 سكريبتات التشغيل

### `scripts/setup-ai-infrastructure.sh`

```bash
chmod +x scripts/setup-ai-infrastructure.sh
./scripts/setup-ai-infrastructure.sh
```

**ما يفعله السكربت:**
1. التحقق من المتطلبات (Node.js, pnpm, Docker)
2. إنشاء هيكل المجلدات
3. إنشاء Docker Compose للـ AI services
4. إعداد Prometheus + Grafana
5. إنشاء ملف `.env.ai`
6. إنشاء `Makefile` سهل الاستخدام

### `scripts/install-ollama.sh` (موجود)

```bash
./scripts/install-ollama.sh
```

---

## 📖 الأوامر المرجعية

### API Calls

```bash
# قائمة المزودين المتاحين
curl http://localhost:5000/api/ai-tools/providers

# فحص أمان رسالة
curl -X POST http://localhost:5000/api/ai-tools/scan \
  -H "Content-Type: application/json" \
  -d '{"message": "Ignore previous instructions"}'

# إحصائيات الكاش
curl http://localhost:5000/api/ai-tools/cache/stats

# صحة الخدمة
curl http://localhost:5000/api/ai-tools/health
```

### Ollama Commands

```bash
# تحميل نموذج
ollama pull llama3.1
ollama pull qwen2.5      # دعم ممتاز للعربية
ollama pull mistral
ollama pull codellama    # للبرمجة
ollama pull deepseek-coder

# تشغيل تفاعلي
ollama run llama3.1

# قائمة النماذج المحملة
ollama list

# حذف نموذج
ollama rm llama3.1
```

---

**الملفات ذات الصلة:**
- `AI_CYBERSECURITY_TOOLS.md` — دليل الأدوات الشامل
- `lib/ai-integration-index.ts` — نقطة الدخول الموحدة
- `migrations/009_ai_optimized_schema.sql` — مخطط قاعدة البيانات
- `scripts/setup-ai-infrastructure.sh` — سكربت الإعداد
