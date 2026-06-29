<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OSINT Hub - مركز أدوات الاستخبارات المفتوحة والأمن السيبراني</title>
    <style>
        :root {
            --primary: #0ea5e9;
            --primary-dark: #0284c7;
            --secondary: #8b5cf6;
            --danger: #ef4444;
            --warning: #f59e0b;
            --success: #10b981;
            --dark: #0f172a;
            --darker: #020617;
            --card: #1e293b;
            --card-hover: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --gradient-1: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%);
            --gradient-2: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
            --gradient-3: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--darker);
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Animated Background */
        .bg-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: 
                radial-gradient(ellipse at 20% 80%, rgba(14, 165, 233, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 1) 0%, var(--darker) 100%);
        }

        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        }

        .particle {
            position: absolute;
            width: 2px;
            height: 2px;
            background: var(--primary);
            border-radius: 50%;
            animation: float 15s infinite;
            opacity: 0.3;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.3; }
            100% { transform: translateY(-100vh) translateX(50px); }
        }

        /* Header */
        header {
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.5rem;
            font-weight: 700;
            background: var(--gradient-1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: var(--gradient-1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            -webkit-text-fill-color: white;
        }

        .search-box {
            position: relative;
            width: 100%;
            max-width: 400px;
        }

        .search-box input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text);
            font-size: 0.95rem;
            transition: all 0.3s;
        }

        .search-box input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
        }

        .search-box::before {
            content: "🔍";
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.5;
        }

        /* Main Content */
        main {
            padding: 2rem 0;
        }

        /* Hero Section */
        .hero {
            text-align: center;
            padding: 3rem 0;
            margin-bottom: 2rem;
        }

        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: var(--gradient-1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero p {
            color: var(--text-muted);
            font-size: 1.1rem;
            max-width: 600px;
            margin: 0 auto;
        }

        /* Legal Warning Banner */
        .legal-warning {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
            border: 1px solid var(--danger);
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            align-items: start;
            gap: 1rem;
        }

        .legal-warning-icon {
            font-size: 2rem;
            flex-shrink: 0;
        }

        .legal-warning h3 {
            color: var(--danger);
            margin-bottom: 0.5rem;
        }

        .legal-warning ul {
            list-style: none;
            padding: 0;
        }

        .legal-warning li {
            padding: 0.25rem 0;
            padding-right: 1.5rem;
            position: relative;
        }

        .legal-warning li::before {
            content: "⚠️";
            position: absolute;
            right: 0;
        }

        /* Category Tabs */
        .tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            justify-content: center;
        }

        .tab-btn {
            padding: 0.75rem 1.5rem;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.95rem;
            font-weight: 600;
        }

        .tab-btn:hover {
            background: var(--card-hover);
            color: var(--text);
        }

        .tab-btn.active {
            background: var(--gradient-1);
            color: white;
            border-color: transparent;
        }

        /* Tools Grid */
        .tools-section {
            display: none;
        }

        .tools-section.active {
            display: block;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid var(--border);
        }

        .section-title .icon {
            font-size: 1.75rem;
        }

        .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }

        /* Tool Card */
        .tool-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 15px;
            padding: 1.5rem;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }

        .tool-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--gradient-1);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .tool-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 10px 30px rgba(14, 165, 233, 0.2);
        }

        .tool-card:hover::before {
            opacity: 1;
        }

        .tool-card.danger::before {
            background: var(--gradient-2);
        }

        .tool-card.danger:hover {
            border-color: var(--danger);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2);
        }

        .tool-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 0.75rem;
        }

        .tool-name {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text);
        }

        .tool-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-free {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success);
        }

        .badge-paid {
            background: rgba(245, 158, 11, 0.2);
            color: var(--warning);
        }

        .badge-legal {
            background: rgba(14, 165, 233, 0.2);
            color: var(--primary);
        }

        .tool-description {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            line-height: 1.6;
        }

        .tool-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .tag {
            padding: 0.25rem 0.5rem;
            background: rgba(148, 163, 184, 0.1);
            border-radius: 5px;
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .tool-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }

        .tool-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--gradient-1);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.3s;
        }

        .tool-link:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(14, 165, 233, 0.4);
        }

        .tool-category {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        /* Table Styles */
        .table-container {
            overflow-x: auto;
            margin-bottom: 2rem;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: var(--card);
            border-radius: 15px;
            overflow: hidden;
        }

        th, td {
            padding: 1rem;
            text-align: right;
            border-bottom: 1px solid var(--border);
        }

        th {
            background: var(--gradient-1);
            color: white;
            font-weight: 600;
        }

        tr:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        td a {
            color: var(--primary);
            text-decoration: none;
        }

        td a:hover {
            text-decoration: underline;
        }

        /* Info Cards */
        .info-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .info-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            text-align: center;
        }

        .info-card-icon {
            font-size: 2rem;
            margin-bottom: 0.75rem;
        }

        .info-card-number {
            font-size: 2rem;
            font-weight: 700;
            background: var(--gradient-1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .info-card-label {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-top: 0.25rem;
        }

        /* Footer */
        footer {
            background: var(--dark);
            border-top: 1px solid var(--border);
            padding: 2rem 0;
            text-align: center;
            color: var(--text-muted);
            margin-top: 3rem;
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        /* Modal */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 2rem;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .modal-title {
            font-size: 1.5rem;
            background: var(--gradient-1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.5rem;
            cursor: pointer;
            transition: color 0.3s;
        }

        .modal-close:hover {
            color: var(--danger);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 1.75rem;
            }

            .tools-grid {
                grid-template-columns: 1fr;
            }

            .header-content {
                flex-direction: column;
            }

            .search-box {
                max-width: 100%;
            }

            .tabs {
                justify-content: flex-start;
                overflow-x: auto;
                flex-wrap: nowrap;
            }

            .legal-warning {
                flex-direction: column;
                text-align: center;
            }
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--darker);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--primary);
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-in {
            animation: fadeIn 0.5s ease-out forwards;
        }

        /* No Results */
        .no-results {
            text-align: center;
            padding: 3rem;
            color: var(--text-muted);
            font-size: 1.2rem;
        }

        /* Copy Button */
        .copy-btn {
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.85rem;
        }

        .copy-btn:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .copy-btn.copied {
            background: var(--success);
            border-color: var(--success);
            color: white;
        }

        /* Highlight */
        .highlight {
            background: rgba(14, 165, 233, 0.3);
            padding: 0.1rem 0.3rem;
            border-radius: 3px;
        }

        /* Command Block */
        .command-block {
            background: var(--darker);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1rem;
            margin: 1rem 0;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            position: relative;
        }

        .command-block .copy-btn {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
        }

        /* Status Indicator */
        .status {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .status-online {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success);
        }

        .status-offline {
            background: rgba(239, 68, 68, 0.2);
            color: var(--danger);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .status-online .status-dot {
            background: var(--success);
        }

        .status-offline .status-dot {
            background: var(--danger);
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="bg-animation"></div>
    <div class="particles" id="particles"></div>

    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-icon">🔍</div>
                    <span>OSINT Hub</span>
                </div>
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="ابحث عن أداة، نظام، أو ميزة..." autocomplete="off">
                </div>
            </div>
        </div>
    </header>

    <main class="container">
        <section class="hero animate-in">
            <h1>مركز أدوات OSINT والأمن السيبراني</h1>
            <p>دليل شامل بأقوى الأدوات والأنظمة في مجال الاستخبارات المفتوحة المصادر والأمن السيبراني للبحث والتحليل</p>
        </section>

        <div class="legal-warning animate-in">
            <div class="legal-warning-icon">⚖️</div>
            <div>
                <h3>تحذيرات قانونية وأخلاقية مهمة</h3>
                <ul>
                    <li>الوصول غير المصرح به إلى بيانات شخصية أو أنظمة خاصة <strong>جريمة إلكترونية</strong> في معظم الدول</li>
                    <li>استخدام أدوات البحث مقبول فقط في اختبار الاختراق المصرح به (Bug Bounty) أو البحث عن معلوماتك الشخصية</li>
                    <li>أدوات "اختراق" الهواتف أو استخراج البيانات بدون إذن <strong>غير قانونية</strong></li>
                    <li>يجب استخدام هذه الأدوات فقط للأغراض الأخلاقية والقانونية</li>
                </ul>
            </div>
        </div>

        <div class="info-cards animate-in">
            <div class="info-card">
                <div class="info-card-icon">🔍</div>
                <div class="info-card-number" id="totalTools">0</div>
                <div class="info-card-label">أداة ونظام</div>
            </div>
            <div class="info-card">
                <div class="info-card-icon">📁</div>
                <div class="info-card-number" id="totalCategories">0</div>
                <div class="info-card-label">فئة متخصصة</div>
            </div>
            <div class="info-card">
                <div class="info-card-icon">🌐</div>
                <div class="info-card-number" id="totalPlatforms">0</div>
                <div class="info-card-label">منصة مدعومة</div>
            </div>
            <div class="info-card">
                <div class="info-card-icon">🛡️</div>
                <div class="info-card-number">100%</div>
                <div class="info-card-label">أخلاقي وقانوني</div>
            </div>
        </div>

        <div class="tabs animate-in">
            <button class="tab-btn active" data-tab="all">الكل</button>
            <button class="tab-btn" data-tab="search">أنظمة البحث</button>
            <button class="tab-btn" data-tab="databases">قواعد البيانات</button>
            <button class="tab-btn" data-tab="phone">أدوات الهاتف</button>
            <button class="tab-btn" data-tab="email">أدوات البريد</button>
            <button class="tab-btn" data-tab="username">البحث بالاسم</button>
            <button class="tab-btn" data-tab="frameworks">أطر العمل</button>
            <button class="tab-btn" data-tab="recon">جمع المعلومات</button>
            <button class="tab-btn" data-tab="legal">التحذيرات</button>
        </div>

        <div id="contentContainer">
            <!-- All Tools Section -->
            <div class="tools-section active" id="section-all">
                <div class="tools-grid" id="allToolsGrid"></div>
            </div>

            <!-- Search Systems -->
            <div class="tools-section" id="section-search">
                <h2 class="section-title"><span class="icon">🔎</span> أنظمة البحث المتقدمة</h2>
                <div class="tools-grid" id="searchToolsGrid"></div>
            </div>

            <!-- Databases -->
            <div class="tools-section" id="section-databases">
                <h2 class="section-title"><span class="icon">🗄️</span> قواعد البيانات العامة</h2>
                <div class="tools-grid" id="databaseToolsGrid"></div>
            </div>

            <!-- Phone Tools -->
            <div class="tools-section" id="section-phone">
                <h2 class="section-title"><span class="icon">📱</span> أدوات تحليل الهاتف</h2>
                <div class="tools-grid" id="phoneToolsGrid"></div>
            </div>

            <!-- Email Tools -->
            <div class="tools-section" id="section-email">
                <h2 class="section-title"><span class="icon">📧</span> البحث عبر البريد الإلكتروني</h2>
                <div class="tools-grid" id="emailToolsGrid"></div>
            </div>

            <!-- Username Tools -->
            <div class="tools-section" id="section-username">
                <h2 class="section-title"><span class="icon">👤</span> البحث عبر الاسم/المستخدم</h2>
                <div class="tools-grid" id="usernameToolsGrid"></div>
            </div>

            <!-- Frameworks -->
            <div class="tools-section" id="section-frameworks">
                <h2 class="section-title"><span class="icon">🛡️</span> أطر العمل الكاملة</h2>
                <div class="table-container">
                    <table id="frameworksTable">
                        <thead>
                            <tr>
                                <th>الأداة</th>
                                <th>الاستخدام</th>
                                <th>النوع</th>
                                <th>الرابط</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <!-- Reconnaissance -->
            <div class="tools-section" id="section-recon">
                <h2 class="section-title"><span class="icon">🕵️</span> أدوات جمع المعلومات (Reconnaissance)</h2>
                <div class="tools-grid" id="reconToolsGrid"></div>
            </div>

            <!-- Legal Warnings -->
            <div class="tools-section" id="section-legal">
                <h2 class="section-title"><span class="icon">⚠️</span> التحذيرات القانونية والأخلاقية</h2>
                <div class="tools-grid" id="legalToolsGrid"></div>
            </div>
        </div>
    </main>

    <footer>
        <div class="container">
            <div class="footer-content">
                <div>© 2024 OSINT Hub - للاستخدام القانوني والأخلاقي فقط</div>
                <div class="status status-online">
                    <span class="status-dot"></span>
                    <span>النظام نشط</span>
                </div>
            </div>
        </div>
    </footer>

    <!-- Modal -->
    <div class="modal-overlay" id="modal">
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title" id="modalTitle">تفاصيل الأداة</h2>
                <button class="modal-close" id="modalClose">✕</button>
            </div>
            <div id="modalContent"></div>
        </div>
    </div>

    <script>
        // ========== DATA ==========
        const toolsData = {
            search: [
                {
                    name: "Maltego",
                    description: "أداة رسومية قوية لتحليل العلاقات بين البيانات وربط المعلومات بشكل مرئي",
                    tags: ["تحليل", "رسومي", "علاقات", "بيانات"],
                    link: "https://www.maltego.com",
                    badge: "paid",
                    category: "نظام بحث متقدم",
                    status: "online",
                    details: "Maltego هو أداة قوية لتحليل الروابط والعلاقات بين البيانات المفتوحة. يستخدم في التحقيقات الرقمية وتحليل الشبكات الاجتماعية."
                },
                {
                    name: "SpiderFoot",
                    description: "أتمتة جمع المعلومات من مصادر متعددة بشكل تلقائي وشامل",
                    tags: ["أتمتة", "مصادر متعددة", "جمع معلومات"],
                    link: "https://www.spiderfoot.net",
                    badge: "free",
                    category: "نظام بحث متقدم",
                    status: "online",
                    details: "SpiderFoot يقوم بجمع المعلومات تلقائياً من أكثر من 100 مصدر مختلف للبيانات المفتوحة."
                },
                {
                    name: "theHarvester",
                    description: "جمع رسائل البريد الإلكتروني والنطاقات الفرعية والموظفين",
                    tags: ["بريد إلكتروني", "نطاقات فرعية", "موظفين"],
                    link: "https://github.com/laramies/theHarvester",
                    badge: "free",
                    category: "نظام بحث متقدم",
                    status: "online",
                    details: "theHarvester أداة مخصصة لجمع البريد الإلكتروني وأسماء الموظفين والنطاقات الفرعية لشركة معينة."
                },
                {
                    name: "Sherlock",
                    description: "البحث عن أسماء المستخدمين عبر منصات متعددة (400+ منصة)",
                    tags: ["اسم مستخدم", "شبكات اجتماعية", "400+ منصة"],
                    link: "https://github.com/sherlock-project/sherlock",
                    badge: "free",
                    category: "نظام بحث متقدم",
                    status: "online",
                    details: "Sherlock يبحث عن اسم المستخدم عبر 400+ منصة اجتماعية وموقع مختلف."
                }
            ],
            databases: [
                {
                    name: "Have I Been Pwned",
                    description: "التحقق من تسريبات البيانات والبريد الإلكتروني في الاختراقات المعروفة",
                    tags: ["تسريبات", "بريد إلكتروني", "تحقق"],
                    link: "https://haveibeenpwned.com",
                    badge: "free",
                    category: "قاعدة بيانات",
                    status: "online",
                    details: "يمكنك التحقق من whether تم تسريب بريدك الإلكتروني في اختراقات البيانات المعروفة."
                },
                {
                    name: "IntelX",
                    description: "محرك بحث في البيانات المسربة والمعلومات العامة والويب المظلم",
                    tags: ["بيانات مسربة", "ويب مظلم", "بحث"],
                    link: "https://intelx.io",
                    badge: "paid",
                    category: "قاعدة بيانات",
                    status: "online",
                    details: "IntelX يوفر محرك بحث قوي في البيانات المسربة والمعلومات المتاحة علنياً."
                },
                {
                    name: "Shodan",
                    description: "محرك بحث للأجهزة المتصلة بالإنترنت والخوادم والإنترنت الأشياء",
                    tags: ["أجهزة", "إنترنت الأشياء", "خوادم"],
                    link: "https://www.shodan.io",
                    badge: "free",
                    category: "قاعدة بيانات",
                    status: "online",
                    details: "Shodan يتيح لك البحث عن الأجهزة المتصلة بالإنترنت: كاميرات، خوادم، أجهزة IoT."
                },
                {
                    name: "Censys",
                    description: "فحص البنية التحتية للإنترنت وتحليل الشهادات الأمنية",
                    tags: ["بنية تحتية", "شهادات", "أمن"],
                    link: "https://censys.io",
                    badge: "free",
                    category: "قاعدة بيانات",
                    status: "online",
                    details: "Censys يركز على فحص الشهادات الرقمية والبنية التحتية للإنترنت."
                }
            ],
            phone: [
                {
                    name: "Truecaller",
                    description: "تحديد هوية المتصل باستخدام قاعدة بيانات مجتمعية ضخمة",
                    tags: ["هوية المتصل", "قاعدة بيانات", "مجتمعية"],
                    link: "https://www.truecaller.com",
                    badge: "free",
                    category: "أدوات الهاتف",
                    status: "online",
                    details: "Truecaller يستخدم قاعدة بيانات مجتمعية لتحديد هوية المتصلين المجهولين."
                },
                {
                    name: "PhoneInfoga",
                    description: "أداة متقدمة لجمع معلومات أرقام الهاتف مع دعم متعدد المصادر",
                    tags: ["أرقام هاتف", "جمع معلومات", "متقدم"],
                    link: "https://github.com/sundowndev/PhoneInfoga",
                    badge: "free",
                    category: "أدوات الهاتف",
                    status: "online",
                    details: "PhoneInfoga أداة متقدمة لجمع معلومات مفصلة عن أرقام الهاتف من مصادر متعددة."
                },
                {
                    name: "Numverify",
                    description: "التحقق من صحة أرقام الهاتف وتحديد الدولة والناقل",
                    tags: ["تحقق", "صحة الرقم", "الناقل", "الدولة"],
                    link: "https://numverify.com",
                    badge: "free",
                    category: "أدوات الهاتف",
                    status: "online",
                    details: "Numverify يوفر API للتحقق من صحة أرقام الهاتف وتحديد موقعها والناقل."
                },
                {
                    name: "NumLookup",
                    description: "تحديد الناقل والدولة والموقع الجغرافي للرقم",
                    tags: ["ناقل", "دولة", "موقع"],
                    link: "https://www.numlookup.com",
                    badge: "free",
                    category: "أدوات الهاتف",
                    status: "online",
                    details: "NumLookup يتيح لك البحث عن معلومات الناقل والدولة لأي رقم هاتف."
                }
            ],
            email: [
                {
                    name: "Holehe",
                    description: "التحقق من وجود الحساب على منصات متعددة باستخدام البريد الإلكتروني",
                    tags: ["تحقق", "منصات متعددة", "حسابات"],
                    link: "https://github.com/megadose/holehe",
                    badge: "free",
                    category: "أدوات البريد",
                    status: "online",
                    details: "Holehe يتحقق من وجود حساب بريد إلكتروني على أكثر من 100 منصة بدون إرسال إشعار."
                },
                {
                    name: "Hunter.io",
                    description: "البحث عن عناوين البريد في الشركات والمجالات المحددة",
                    tags: ["شركات", "مجالات", "بحث"],
                    link: "https://hunter.io",
                    badge: "free",
                    category: "أدوات البريد",
                    status: "online",
                    details: "Hunter.io يساعد في العثور على عناوين البريد الإلكتروني المرتبطة بشركة أو مجال معين."
                },
                {
                    name: "Have I Been Pwned",
                    description: "التحقق من تسريبات البيانات (مدرج أيضاً في قواعد البيانات)",
                    tags: ["تسريبات", "تحقق", "بيانات"],
                    link: "https://haveibeenpwned.com",
                    badge: "free",
                    category: "أدوات البريد",
                    status: "online",
                    details: "تحقق مما إذا كان بريدك الإلكتروني قد ظهر في أي اختراقات معروفة."
                }
            ],
            username: [
                {
                    name: "Sherlock",
                    description: "البحث عن اسم المستخدم عبر 400+ منصة (مدرج أيضاً في البحث المتقدم)",
                    tags: ["400+ منصة", "اسم مستخدم", "شبكات اجتماعية"],
                    link: "https://github.com/sherlock-project/sherlock",
                    badge: "free",
                    category: "البحث بالاسم",
                    status: "online",
                    details: "Sherlock يبحث عن اسم المستخدم عبر مئات المنصات الاجتماعية والمواقع."
                },
                {
                    name: "Social Searcher",
                    description: "البحث في الشبكات الاجتماعية بدون تسجيل دخول",
                    tags: ["شبكات اجتماعية", "بحث", "بدون تسجيل"],
                    link: "https://www.social-searcher.com",
                    badge: "free",
                    category: "البحث بالاسم",
                    status: "online",
                    details: "Social Searcher يسمح بالبحث في الشبكات الاجتماعية بدون الحاجة لحسابات."
                },
                {
                    name: "Pipl",
                    description: "محرك بحث مدفوع للأشخاص مع معلومات مفصلة",
                    tags: ["مدفوع", "أشخاص", "معلومات مفصلة"],
                    link: "https://pipl.com",
                    badge: "paid",
                    category: "البحث بالاسم",
                    status: "online",
                    details: "Pipl هو محرك بحث متخصص للعثور على الأشخاص ومعلوماتهم المتاحة علنياً."
                }
            ],
            frameworks: [
                { name: "Metasploit", usage: "اختبار الاختراق والتطوير", type: "إطار عمل", link: "https://www.metasploit.com" },
                { name: "Burp Suite", usage: "اختبار أمان تطبيقات الويب", type: "أداة ويب", link: "https://portswigger.net/burp" },
                { name: "Nmap", usage: "فحص الشبكات والمنافذ", type: "فحص شبكات", link: "https://nmap.org" },
                { name: "Wireshark", usage: "تحليل حركة المرور والبروتوكولات", type: "تحليل شبكات", link: "https://www.wireshark.org" },
                { name: "OWASP ZAP", usage: "اختبار اختراق الويب", type: "أمان ويب", link: "https://www.zaproxy.org" },
                { name: "Kali Linux", usage: "توزيعة متكاملة للاختبار الأخلاقي", type: "نظام تشغيل", link: "https://www.kali.org" }
            ],
            recon: [
                {
                    name: "Recon-ng",
                    description: "إطار عمل ويب مخصص للـ OSINT مع وحدات متعددة",
                    tags: ["ويب", "وحدات", "أتمتة"],
                    link: "https://github.com/lanmaster53/recon-ng",
                    badge: "free",
                    category: "جمع المعلومات",
                    status: "online",
                    details: "Recon-ng هو إطار عمل ويب كامل لأتمتة عمليات جمع المعلومات المفتوحة."
                },
                {
                    name: "OSINT Framework",
                    description: "دليل منظم لمصادر المعلومات المفتوحة مع تصنيفات شاملة",
                    tags: ["دليل", "تصنيفات", "مصادر"],
                    link: "https://osintframework.com",
                    badge: "free",
                    category: "جمع المعلومات",
                    status: "online",
                    details: "OSINT Framework يوفر دليلاً منظماً شاملاً لمصادر المعلومات المفتوحة."
                },
                {
                    name: "DarkSearch",
                    description: "محرك بحث في الويب المظلم لتحليل المحتوى المخفي",
                    tags: ["ويب مظلم", "بحث", "تحليل"],
                    link: "https://darksearch.io",
                    badge: "free",
                    category: "جمع المعلومات",
                    status: "online",
                    details: "DarkSearch يتيح البحث في محتوى الويب المظلم والإنترنت المخفي."
                }
            ],
            legal: [
                {
                    name: "الوصول غير المصرح به",
                    description: "الوصول إلى بيانات شخصية أو أنظمة خاصة بدون إذن هو جريمة إلكترونية في معظم الدول",
                    tags: ["تحذير", "جريمة", "غير قانوني"],
                    link: "#",
                    badge: "legal",
                    category: "تحذير قانوني",
                    status: "offline",
                    details: "هذا النشاط غير قانوني ويحمل عقوبات سجنية وغرامات مالية في معظم الدول."
                },
                {
                    name: "اختبار الاختراق المصرح به",
                    description: "Bug Bounty - الاختبار القانوني مع إذن مسبق من صاحب النظام",
                    tags: ["قانوني", "Bug Bounty", "مصرح"],
                    link: "https://bugcrowd.com",
                    badge: "legal",
                    category: "استخدام قانوني",
                    status: "online",
                    details: "الاختبار المصرح به هو النشاط الوحيد القانوني لاختبار اختراق الأنظمة."
                },
                {
                    name: "حماية النظام الخاص بك",
                    description: "استخدام الأدوات لفحص وتحليل أمان نظامك الشخصي",
                    tags: ["قانوني", "حماية", "نظام شخصي"],
                    link: "#",
                    badge: "legal",
                    category: "استخدام قانوني",
                    status: "online",
                    details: "مسموح لك باستخدام كل الأدوات لفحص وتحليل نظامك الخاص أو الأنظمة التي تمتلك إذناً باختبارها."
                },
                {
                    name: "التحقق من هوية المتصلين",
                    description: "استخدام الأدوات للتحقق من هوية المتصلين المشبوهين",
                    tags: ["قانوني", "تحقق", "هوية"],
                    link: "#",
                    badge: "legal",
                    category: "استخدام قانوني",
                    status: "online",
                    details: "التحقق من هوية المتصلين لحماية نفسك من التصيد الاحتيالي والاحتيال."
                }
            ]
        };

        // ========== PARTICLES ==========
        function createParticles() {
            const container = document.getElementById('particles');
            for (let i = 0; i < 50; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 15 + 's';
                particle.style.animationDuration = (10 + Math.random() * 20) + 's';
                container.appendChild(particle);
            }
        }

        // ========== RENDER FUNCTIONS ==========
        function createToolCard(tool, index) {
            const isDanger = tool.category.includes('تحذير') || tool.category.includes('غير قانوني');
            const statusClass = tool.status === 'online' ? 'status-online' : 'status-offline';
            const statusText = tool.status === 'online' ? 'نشط' : 'محظور';
            
            let badgeClass = 'badge-free';
            if (tool.badge === 'paid') badgeClass = 'badge-paid';
            if (tool.badge === 'legal') badgeClass = 'badge-legal';

            let badgeText = 'مجاني';
            if (tool.badge === 'paid') badgeText = 'مدفوع';
            if (tool.badge === 'legal') badgeText = 'قانوني';

            return `
                <div class="tool-card ${isDanger ? 'danger' : ''} animate-in" style="animation-delay: ${index * 0.05}s" onclick="openModal('${tool.name}', '${tool.category}')">
                    <div class="tool-header">
                        <div class="tool-name">${tool.name}</div>
                        <span class="tool-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="tool-description">${tool.description}</div>
                    <div class="tool-tags">
                        ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="tool-footer">
                        <a href="${tool.link}" class="tool-link" target="_blank" onclick="event.stopPropagation()">
                            زيارة الموقع ↗
                        </a>
                        <span class="status ${statusClass}">
                            <span class="status-dot"></span>
                            ${statusText}
                        </span>
                    </div>
                </div>
            `;
        }

        function renderGrid(tools, containerId) {
            const container = document.getElementById(containerId);
            if (tools.length === 0) {
                container.innerHTML = '<div class="no-results">لا توجد نتائج للبحث</div>';
                return;
            }
            container.innerHTML = tools.map((tool, i) => createToolCard(tool, i)).join('');
        }

        function renderTable(frameworks) {
            const tbody = document.querySelector('#frameworksTable tbody');
            tbody.innerHTML = frameworks.map(f => `
                <tr>
                    <td><strong>${f.name}</strong></td>
                    <td>${f.usage}</td>
                    <td><span class="tag">${f.type}</span></td>
                    <td><a href="${f.link}" target="_blank">الرابط ↗</a></td>
                </tr>
            `).join('');
        }

        // ========== MODAL ==========
        function openModal(name, category) {
            const allTools = [...toolsData.search, ...toolsData.databases, ...toolsData.phone, 
                            ...toolsData.email, ...toolsData.username, ...toolsData.recon, ...toolsData.legal];
            const tool = allTools.find(t => t.name === name && t.category === category);
            
            if (!tool) return;

            const modal = document.getElementById('modal');
            const title = document.getElementById('modalTitle');
            const content = document.getElementById('modalContent');

            title.textContent = tool.name;
            content.innerHTML = `
                <div class="tool-tags" style="margin-bottom: 1rem;">
                    ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <p style="margin-bottom: 1rem; line-height: 1.8;">${tool.description}</p>
                <p style="margin-bottom: 1rem; line-height: 1.8;">${tool.details || ''}</p>
                <div class="command-block">
                    <button class="copy-btn" onclick="copyToClipboard(this, '${tool.link}')">نسخ الرابط</button>
                    <span style="color: var(--primary);">${tool.link}</span>
                </div>
                <div style="margin-top: 1.5rem;">
                    <a href="${tool.link}" target="_blank" class="tool-link" style="width: 100%; justify-content: center;">
                        فتح الموقع في نافذة جديدة ↗
                    </a>
                </div>
            `;

            modal.classList.add('active');
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('active');
        }

        function copyToClipboard(btn, text) {
            navigator.clipboard.writeText(text).then(() => {
                btn.classList.add('copied');
                btn.textContent = 'تم النسخ!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.textContent = 'نسخ الرابط';
                }, 2000);
            });
        }

        // ========== SEARCH ==========
        function filterTools(searchTerm) {
            const term = searchTerm.toLowerCase();
            const allTools = [...toolsData.search, ...toolsData.databases, ...toolsData.phone, 
                            ...toolsData.email, ...toolsData.username, ...toolsData.recon, ...toolsData.legal];
            
            return allTools.filter(tool => 
                tool.name.toLowerCase().includes(term) ||
                tool.description.toLowerCase().includes(term) ||
                tool.tags.some(tag => tag.toLowerCase().includes(term)) ||
                tool.category.toLowerCase().includes(term)
            );
        }

        function highlightSearch(text, term) {
            if (!term) return text;
            const regex = new RegExp(`(${term})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        }

        // ========== STATS ==========
        function updateStats() {
            const allTools = [...toolsData.search, ...toolsData.databases, ...toolsData.phone, 
                            ...toolsData.email, ...toolsData.username, ...toolsData.recon, ...toolsData.legal];
            const categories = new Set(allTools.map(t => t.category));
            
            document.getElementById('totalTools').textContent = allTools.length;
            document.getElementById('totalCategories').textContent = categories.size;
            document.getElementById('totalPlatforms').textContent = '400+';
        }

        // ========== TABS ==========
        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tools-section').forEach(section => section.classList.remove('active'));
            
            document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
            document.getElementById(`section-${tabId}`).classList.add('active');
        }

        // ========== EVENT LISTENERS ==========
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            const term = e.target.value;
            const allSection = document.getElementById('section-all');
            const allGrid = document.getElementById('allToolsGrid');
            
            if (term) {
                const filtered = filterTools(term);
                allGrid.innerHTML = filtered.map((tool, i) => createToolCard(tool, i)).join('');
                allSection.classList.add('active');
                document.querySelectorAll('.tools-section').forEach(s => {
                    if (s.id !== 'section-all') s.classList.remove('active');
                });
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            } else {
                switchTab('all');
                renderAll();
            }
        });

        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal')) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // ========== INITIALIZATION ==========
        function renderAll() {
            renderGrid(toolsData.search, 'searchToolsGrid');
            renderGrid(toolsData.databases, 'databaseToolsGrid');
            renderGrid(toolsData.phone, 'phoneToolsGrid');
            renderGrid(toolsData.email, 'emailToolsGrid');
            renderGrid(toolsData.username, 'usernameToolsGrid');
            renderGrid(toolsData.recon, 'reconToolsGrid');
            renderGrid(toolsData.legal, 'legalToolsGrid');
            renderTable(toolsData.frameworks);
            
            const allTools = [...toolsData.search, ...toolsData.databases, ...toolsData.phone, 
                            ...toolsData.email, ...toolsData.username, ...toolsData.recon, ...toolsData.legal];
            renderGrid(allTools, 'allToolsGrid');
        }

        function init() {
            createParticles();
            renderAll();
            updateStats();
        }

        init();
    </script>
</body>
</html>
