# 🤖 أدوات الذكاء الاصطناعي والأمن السيبراني المتكاملة
# AI & Cybersecurity Tools Integration Guide — Yode9 / MR7.AI

> **الإصدار:** 1.0.0  
> **التاريخ:** 2026-06-30  
> **التوافق:** Yode9 / MR7.AI Platform

---

## 📋 جدول المحتويات

1. [نماذج الذكاء الاصطناعي](#نماذج-الذكاء-الاصطناعي)
2. [أدوات الاستضافة والـ Inference](#أدوات-الاستضافة-والـ-inference)
3. [قواعد البيانات المتخصصة](#قواعد-البيانات-المتخصصة)
4. [أدوات الأمن السيبراني](#أدوات-الأمن-السيبراني)
5. [تحسين الأداء والاستجابة](#تحسين-الأداء-والاستجابة)
6. [البنية التحتية والاستضافة](#البنية-التحتية-والاستضافة)
7. [الملفات المُنشأة](#الملفات-المنشأة)

---

## 🤖 نماذج الذكاء الاصطناعي

### للاستضافة الذاتية (Self-Hosted)

| النموذج | الاستخدام | التكامل |
|---------|-----------|---------|
| **Llama 3.1 70B** | محادثات عامة | عبر Ollama API |
| **Mistral 7B** | أداء جيد مع سرعة | Local Ollama |
| **Qwen 2.5** | متعدد اللغات (العربية) | Custom Endpoint |
| **DeepSeek Coder** | البرمجة والتقنية | Ollama |
| **CodeLlama** | توليد الكود | Local Ollama |

### للـ API السحابي

| المزود | السرعة | الجودة | التكلفة |
|--------|--------|--------|---------|
| **OpenAI GPT-4o** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ |
| **Anthropic Claude 3.5** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ |
| **Groq API** | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ |
| **Together.ai** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ |
| **Fireworks AI** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $ |

---

## ⚡ أدوات الاستضافة والـ Inference

### Ollama — للتطوير المحلي

```bash
# تثبيت Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# تشغيل نموذج
ollama pull llama3.1
ollama pull qwen2.5
ollama pull mistral
ollama pull codellama

# تشغيل الخادم
ollama serve
```

### Docker Compose للنشر السريع

```yaml
# infrastructure/docker/docker-compose.ai.yml (موجود في المشروع)
services:
  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
  
  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## 🗄️ قواعد البيانات المتخصصة

### AI-Optimized Schema (Migration 009)

الملف: `migrations/009_ai_optimized_schema.sql`

**الجداول المُنشأة:**

| الجدول | الوصف |
|--------|-------|
| `ai_conversations` | سجل المحادثات مع النماذج |
| `ai_messages` | الرسائل مع معلومات التوكنز والتكلفة |
| `ai_response_cache` | كاش الردود المتكررة |
| `ai_security_events` | سجل الأحداث الأمنية |
| `ai_performance_metrics` | مقاييس أداء النماذج |
| `user_ai_preferences` | إعدادات النموذج لكل مستخدم |

**تطبيق المايغريشن:**
```bash
psql $DATABASE_URL -f migrations/009_ai_optimized_schema.sql
```

---

## 🔒 أدوات الأمن السيبراني

### AISecurityGuard — حماية من Prompt Injection

الملف: `lib/ai-security-guard.ts`

```typescript
import { AISecurityGuard } from './lib/ai-security-guard';

// فحص المدخل
const result = AISecurityGuard.scanInput(userMessage);
if (!result.isSafe) {
  console.log('Threats detected:', result.threats);
}

// تنظيف المخرجات
const cleaned = AISecurityGuard.validateOutput(modelResponse);
```

**ما يكتشفه:**
- ✅ Prompt Injection patterns
- ✅ Jailbreak attempts
- ✅ Dangerous keywords (rm -rf, DROP TABLE, etc.)
- ✅ Encoded XSS attempts
- ✅ تسريب API Keys في المخرجات
- ✅ تسريب عناوين IP

### Rate Limiting

```typescript
// في server/routes/ai-tools.ts
// نقطة نهاية /api/ai-tools/scan لفحص الرسائل تلقائياً
```

---

## ⚡ تحسين الأداء والاستجابة

### Streaming Optimization

الملف: `lib/ai-streaming.ts`

```typescript
import { AIStreamingOptimizer } from './lib/ai-streaming';

// معالجة stream محسّن
const fullResponse = await AIStreamingOptimizer.processStream(stream, {
  bufferSize: 5,
  onChunk: (chunk) => {
    // إرسال للعميل
    res.write(AIStreamingOptimizer.createSSEResponse(chunk.content));
  },
  onComplete: (content, tokens) => {
    console.log(`Done: ${tokens} tokens`);
  }
});
```

### Caching Strategy

الملف: `lib/ai-cache.ts`

```typescript
import { globalAICache } from './lib/ai-cache';

// التحقق من الكاش قبل الطلب
const cached = globalAICache.get(message, model);
if (cached) {
  return cached.response; // توفير استهلاك API
}

// حفظ الرد في الكاش
globalAICache.set(message, model, response, tokens, provider);
```

---

## 🌐 البنية التحتية والاستضافة

### إعداد سريع

```bash
# تشغيل سكربت الإعداد الكامل
chmod +x scripts/setup-ai-infrastructure.sh
./scripts/setup-ai-infrastructure.sh

# تشغيل الخدمات
cd infrastructure && make start

# تشغيل المراقبة
cd infrastructure && make monitoring-start
```

### نقاط النهاية API الجديدة

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/ai-tools/providers` | GET | قائمة المزودين المتاحين |
| `/api/ai-tools/scan` | POST | فحص أمان الرسالة |
| `/api/ai-tools/validate` | POST | التحقق من صحة الطلب |
| `/api/ai-tools/cache/stats` | GET | إحصائيات الكاش |
| `/api/ai-tools/sanitize-output` | POST | تنظيف مخرجات النموذج |
| `/api/ai-tools/health` | GET | فحص صحة الخدمة |

---

## 📁 الملفات المُنشأة

| الملف | النوع | الوصف |
|-------|-------|-------|
| `lib/ai-providers.ts` | TypeScript | إعدادات مزودي AI |
| `lib/ai-security-guard.ts` | TypeScript | حماية من الهجمات |
| `lib/ai-streaming.ts` | TypeScript | تحسين الـ Streaming |
| `lib/ai-cache.ts` | TypeScript | إدارة التخزين المؤقت |
| `lib/ai-integration-index.ts` | TypeScript | نقطة دخول موحدة |
| `server/routes/ai-tools.ts` | TypeScript | API Routes |
| `migrations/009_ai_optimized_schema.sql` | SQL | مخطط قاعدة البيانات |
| `scripts/setup-ai-infrastructure.sh` | Bash | سكربت الإعداد التلقائي |
| `AI_CYBERSECURITY_TOOLS.md` | Markdown | هذا الملف |
| `docs/INFRASTRUCTURE_TOOLS.md` | Markdown | توثيق البنية التحتية |

---

**للمزيد من التفاصيل:** راجع `docs/INFRASTRUCTURE_TOOLS.md`
