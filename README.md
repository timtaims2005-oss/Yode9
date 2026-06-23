

منصة ذكاء اصطناعي متخصصة في الأمن السيبراني مع واجهة ثلاثية الأبعاد مستقبلية.

## 🚀 التشغيل السريع

### المتطلبات الأساسية
- Node.js >= 20.0.0
- pnpm (مدير الحزم)
- PostgreSQL (يتم إعداده تلقائياً عند النشر)

### 1. تثبيت الحزم
```bash
pnpm install
```

### 2. إعداد المتغيرات البيئية
```bash
cp .env.example .env
```

ثم عدّل `.env` وأضف:
- `SESSION_SECRET` - مفتاح سري للجلسات (أنشئ واحدة عشوائية)
- `INTERNAL_API_KEY` - مفتاح API لحماية المسارات
- مفاتيح AI providers (OpenAI, Anthropic, Groq, etc.)

### 3. تشغيل المشروع

**تشغيل السيرفر الخلفي (API Server):**
```bash
cd artifacts/api-server
pnpm run dev
```
السيرفر سيعمل على المنفذ `8080`

**تشغيل الواجهة الأمامية (Frontend):**
```bash
cd artifacts/mr7-ai
pnpm run dev
```
الواجهة ستعمل على المنفذ `5173`

### 4. الوصول للتطبيق
افتح المتصفح على: `http://localhost:5173`

---

## 📦 رفع المشروع على GitHub

### 1. إنشاء repository جديد على GitHub
```bash
# من مجلد المشروع
git remote set-url origin https://github.com/YOUR_USERNAME/mr7-ai.git
```

### 2. رفع التغييرات
```bash
git add .
git commit -m "fix: comprehensive security improvements and 3D UI enhancements"
git push -u origin main
```

### 3. (اختياري) إنشاء release
```bash
git tag v2.0.0
git push origin v2.0.0
```

---

## 🔧 ما تم إصلاحه وإضافته

### الأمان (Security Fixes)
- ✅ نقل نظام الاشتراكات للسيرفر (إزالة ADMIN_SECRET من العميل)
- ✅ إصلاح `internalAuth` لرفض الطلبات بدون مفتاح
- ✅ التحقق من المتغيرات البيئية عند الإقلاع
- ✅ تأمين WebSocket Terminal بالمصادقة
- ✅ تأمين Cloud Chats و Providers بـ internalAuth
- ✅ إصلاح CORS في الإنتاج
- ✅ استبدال `new Function()` بتقييم رياضي آمن
- ✅ إضافة Zod validation على كل routes

### قاعدة البيانات
- ✅ 7 جداول جاهزة (subscriptions, cloud_chats, audit_logs, api_keys, conversations, messages, sessions)
- ✅ إنشاء الجداول تلقائياً عند الإقلاع

### الواجهة ثلاثية الأبعاد (3D UI)
- ✅ `CyberneticBackground` - شبكة عصبية نابضة في الخلفية
- ✅ `HoloChatBubble` - فقاعات محادثات هولوغرافية
- ✅ `ThreatRadar` - رادار تهديدات ثلاثي الأبعاد
- ✅ `TokenGauge` - عداد tokens دائري متحرك
- ✅ `ProviderStatusOrbs` - كرات حالة المزودين
- ✅ `SystemHealthMatrix` - مصفوفة صحة النظام
- ✅ `NeuralSidebar` - شريط جانبي مع تأثيرات نيون
- ✅ `AmbientLayer` - طبقات ب Ambient مُحمّلة بـ lazy loading

### الأداء (Performance)
- ✅ Lazy load لجميع المكونات ثلاثية الأبعاد الثقيلة
- ✅ تحسين حجم Bundle الأولي
- ✅ تقسيم المكونات إلى ملفات أصغر

---

## 🌐 النشر (Deployment)

### Replit (الأسهل)
المشروع مُهيّأ للعمل على Replit تلقائياً. فقط ارفعه وشغّله.

### VPS / Server
```bash
# على السيرفر
git clone YOUR_REPO_URL
cd mr7-ai
pnpm install
cp .env.example .env
# عدّل .env بالقيم الصحيحة
pnpm run build
pnpm run start
```

---

## 🔑 المتغيرات البيئية المهمة

| المتغير | الوصف | مطلوب؟ |
|---------|--------|---------|
| `DATABASE_URL` | رابط قاعدة البيانات | ✅ (تلقائي) |
| `SESSION_SECRET` | مفتاح سرّي للجلسات | ✅ |
| `INTERNAL_API_KEY` | مفتاح API للحماية | ✅ |
| `OPENAI_API_KEY` | مفتاح OpenAI | اختياري |
| `ANTHROPIC_API_KEY` | مفتاح Anthropic | اختياري |
| `GROQ_API_KEY` | مفتاح Groq | اختياري |
| `ALLOWED_ORIGINS` | origins المسموح بها | اختياري |

---

## 📝 ملاحظات مهمة

1. **قاعدة البيانات**: سيتم إنشاؤها تلقائياً عند أول تشغيل
2. **الاشتراكات**: النظام يعمل بالتحقق من السيرفر (لا يوجد سر في العميل)
3. **الـ 3D**: بعض المكونات تتطلب WebGL 2.0
4. **الأمان**: غيّر كل المفاتيح الافتراضية قبل النشر في الإنتاج

---

## 🤝 المساهمة

Pull requests مرحب بها! للم changes الكبيرة، افتح issue أولاً لمناقشتها.

---

## 📄 الترخيص

MIT License
