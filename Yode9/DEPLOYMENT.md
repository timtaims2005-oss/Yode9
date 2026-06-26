# 🚀 دليل النشر - MR7.AI / KaliGPT

## المتطلبات الأساسية

- Node.js >= 20.0.0
- pnpm (مدير الحزم)
- قاعدة بيانات PostgreSQL/MySQL
- مفاتيح API لمزودي الذكاء الاصطناعي

## 1. الإعداد المحلي

### 1.1 تثبيت الاعتماديات

```bash
pnpm install
```

### 1.2 إعداد المتغيرات البيئية

انسخ `.env.example` إلى `.env` وعدّل القيم:

```bash
cp .env.example .env
```

**المتغيرات المطلوبة:**

```bash
# قاعدة البيانات
DATABASE_URL=postgresql://user:password@localhost:5432/mr7_ai

# الأمان
SESSION_SECRET=<سلسلة-عشوائية-طويلة>
INTERNAL_API_KEY=<سلسلة-عشوائية-طويلة>
ADMIN_SECRET=<كلمة-سر-القوى-التنفيذي>

# مزودو الذكاء الاصطناعي (اختر واحداً على الأقل)
GROQ_API_KEY=<مفتاحك>
OPENAI_API_KEY=<مفتاحك>
ANTHROPIC_API_KEY=<مفتاحك>
GEMINI_API_KEY=<مفتاحك>

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 1.3 توليد المفاتيح السرية

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

نفّذ هذا الأمر مرتين - مرة لـ `SESSION_SECRET` ومرة لـ `INTERNAL_API_KEY`.

## 2. تشغيل المشروع محلياً

### 2.1 تشغيل السيرفر الخلفي

```bash
cd artifacts/api-server
pnpm run dev
```

السيرفر سيعمل على `http://localhost:8080`

**ملاحظة:** عند أول تشغيل، سيقوم السيرفر تلقائياً بإنشاء جميع جداول قاعدة البيانات.

### 2.2 تشغيل الواجهة الأمامية

في نافذة terminal أخرى:

```bash
cd artifacts/mr7-ai
pnpm run dev
```

الواجهة ستعمل على `http://localhost:5173`

### 2.3 فتح التطبيق

افتح المتصفح على: `http://localhost:5173`

## 3. النشر على Vercel

### 3.1 إعداد Vercel

```bash
npm install -g vercel
vercel login
```

### 3.2 نشر المشروع

```bash
vercel
```

### 3.3 إضافة المتغيرات البيئية في Vercel

```bash
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add INTERNAL_API_KEY
vercel env add ADMIN_SECRET
vercel env add GROQ_API_KEY
```

## 4. النشر على Netlify

### 4.1 إعداد Netlify

```bash
npm install -g netlify-cli
netlify login
```

### 4.2 نشر المشروع

```bash
netlify deploy --build
```

### 4.3 إضافة المتغيرات البيئية في Netlify

اذهب إلى Dashboard > Site settings > Environment variables

## 5. النشر على VPS تقليدي

### 5.1 إعداد السيرفر

```bash
# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت pnpm
npm install -g pnpm

# تثبيت PostgreSQL
sudo apt-get install -y postgresql
```

### 5.2 إعداد قاعدة البيانات

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE mr7_ai;
CREATE USER mr7_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mr7_ai TO mr7_user;
\q
```

### 5.3 نشر المشروع

```bash
git clone https://github.com/timtaims2005-oss/Yode9.git
cd Yode9
pnpm install
cp .env.example .env
# عدّل .env بالقيم الصحيحة
pnpm run build
```

### 5.4 إعداد PM2

```bash
npm install -g pm2

# تشغيل السيرفر الخلفي
cd artifacts/api-server
pm2 start "pnpm run start" --name mr7-api

# تشغيل الواجهة الأمامية
cd ../mr7-ai
pm2 start "pnpm run start" --name mr7-ui

# حفظ إعدادات PM2
pm2 save
pm2 startup
```

### 5.5 إعداد Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # الواجهة الأمامية
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # السيرفر الخلفي
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
```

## 6. النشر باستخدام Docker

### 6.1 إنشاء Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build

EXPOSE 3000 5173

CMD ["pnpm", "run", "start"]
```

### 6.2 بناء وتشغيل الحاوية

```bash
docker build -t mr7-ai .
docker run -p 3000:3000 -p 5173:5173 --env-file .env mr7-ai
```

## 7. التحقق من النشر

### 7.1 اختبار الصحة

```bash
curl http://localhost:8080/api/health
```

### 7.2 اختبار الواجهة

افتح `http://localhost:5173` في المتصفح

### 7.3 اختبار قاعدة البيانات

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscriptions;"
```

## 8. استكشاف الأخطاء وإصلاحها

### 8.1 خطأ في الاتصال بقاعدة البيانات

**المشكلة:** `DATABASE_URL` غير صحيح أو قاعدة البيانات غير متاحة

**الحل:**
- تحقق من أن قاعدة البيانات قيد التشغيل
- تحقق من صحة `DATABASE_URL`
- تأكد من أن المستخدم لديه الصلاحيات اللازمة

### 8.2 خطأ في تحميل المكونات 3D

**المشكلة:** WebGL غير مدعوم في المتصفح

**الحل:**
- تأكد من أن المتصفح يدعم WebGL 2.0
- جرب متصفح آخر (Chrome, Firefox, Edge)
- تحقق من إعدادات GPU في المتصفح

### 8.3 خطأ في CORS

**المشكلة:** طلبات API محجوبة

**الحل:**
- أضف نطاقك إلى `ALLOWED_ORIGINS` في `.env`
- تأكد من أن البروتوكول (http/https) صحيح

### 8.4 خطأ في الاشتراكات

**المشكلة:** لا يمكن تفعيل الاشتراكات

**الحل:**
- تحقق من أن `ADMIN_SECRET` صحيح
- تأكد من أن الجداول تم إنشاؤها في قاعدة البيانات
- تحقق من logs السيرفر الخلفي

## 9. الصيانة

### 9.1 النسخ الاحتياطي

```bash
# تصدير قاعدة البيانات
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# استيراد قاعدة البيانات
psql $DATABASE_URL < backup_20240101.sql
```

### 9.2 التحديث

```bash
git pull origin main
pnpm install
pnpm run build
pm2 restart all
```

### 9.3 المراقبة

```bash
# عرض logs
pm2 logs

# مراقبة الأداء
pm2 monit

# إعادة تشغيل عند الفشل
pm2 start ecosystem.config.js --watch
```

## 10. الأمان في الإنتاج

### 10.1 قائمة التحقق

- ✅ تغيير جميع المفاتيح الافتراضية
- ✅ تمكين HTTPS
- ✅ إعداد جدار الحماية
- ✅ تفعيل Rate Limiting
- ✅ مراقبة الـ logs
- ✅ النسخ الاحتياطي التلقائي
- ✅ تحديث الاعتماديات بانتظام

### 10.2 أوامر مفيدة

```bash
# فحص الثغرات الأمنية
pnpm audit

# تحديث الاعتماديات
pnpm update

# فحص الأمان مع Snyk
npx snyk test
```

## 11. الدعم

للحصول على المساعدة:
- افتح issue على GitHub
- راجع الوثائق في المجلدات
- تحقق من logs النظام

---

**ملاحظة:** قاعدة البيانات ستكون متاحة تلقائياً عند تشغيل المشروع. السيرفر سيقوم بإنشاء جميع الجداول المطلوبة عند أول تشغيل.
