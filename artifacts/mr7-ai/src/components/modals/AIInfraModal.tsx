import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Server, Cpu, Database, Shield, Activity, Globe,
  Cloud, Zap, Terminal, Network, Lock, BarChart2,
  Copy, CheckCheck, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Settings, Box, Layers, Wifi, Eye,
} from "lucide-react";

export interface AIInfraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "models" | "inference" | "security" | "monitoring" | "database" | "infrastructure" | "performance";

interface InfraItem {
  name: string;
  desc: string;
  type: string;
  tags: string[];
  link?: string;
  config?: string;
  color: string;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "models",        label: "نماذج AI",      icon: Cpu },
  { id: "inference",     label: "الاستدلال",      icon: Zap },
  { id: "security",      label: "الأمن",          icon: Shield },
  { id: "monitoring",    label: "المراقبة",        icon: Activity },
  { id: "database",      label: "قواعد البيانات",  icon: Database },
  { id: "infrastructure",label: "البنية التحتية",  icon: Cloud },
  { id: "performance",   label: "الأداء",          icon: BarChart2 },
];

const MODELS: InfraItem[] = [
  { name: "Llama 3.3 70B", desc: "نموذج ميتا الأقوى للمحادثات العامة. يعمل عبر Ollama API أو vLLM. يحتاج 2x A100 GPU.", type: "Self-Hosted", tags: ["Self-Hosted","Ollama","70B","CUDA"], color: "#6366f1", link: "https://ollama.com/library/llama3.3" },
  { name: "Mistral Large", desc: "أداء متميز للمهام التقنية والعربية. يعمل عبر HuggingFace Spaces أو API مباشر.", type: "Self-Hosted", tags: ["Mistral","HuggingFace","32B"], color: "#8b5cf6", link: "https://mistral.ai" },
  { name: "Qwen 2.5 72B", desc: "أفضل نموذج متعدد اللغات مع دعم ممتاز للعربية. يحتاج 2x A100.", type: "Self-Hosted", tags: ["Arabic","Multilingual","72B"], color: "#06b6d4", link: "https://huggingface.co/Qwen" },
  { name: "DeepSeek V3", desc: "متخصص في البرمجة والتقنية بتكلفة منخفضة. يحتاج 8x H100 GPU.", type: "Self-Hosted", tags: ["Code","Technical","671B MoE"], color: "#10b981", link: "https://deepseek.com" },
  { name: "OpenAI GPT-4o", desc: "الأسرع والأقوى من OpenAI عبر API سحابي. يدعم الرؤية والنصوص والصوت.", type: "Cloud API", tags: ["OpenAI","Multimodal","Vision"], color: "#e21227", link: "https://openai.com" },
  { name: "Claude 3.5 Sonnet", desc: "أفضل نموذج لكتابة الكود والتحليل المعقد من Anthropic. خزان السياق 200K.", type: "Cloud API", tags: ["Anthropic","200K","Code"], color: "#f59e0b", link: "https://anthropic.com" },
  { name: "Groq LPU", desc: "الأسرع على الإطلاق بـ 1200 token/sec. مثالي للاستجابة الفورية.", type: "Cloud API", tags: ["Ultra-Fast","1200 t/s","Llama","Mixtral"], color: "#f97316", link: "https://groq.com" },
  { name: "Together AI", desc: "مزود مفتوح المصدر عالي الجودة بتكاليف تنافسية مع دعم نماذج متعددة.", type: "Cloud API", tags: ["Open Source","Competitive","Multi-model"], color: "#3b82f6", link: "https://together.ai" },
  { name: "Fireworks AI", desc: "بنية تحتية محسّنة للاستدلال السريع بأقل تكلفة في السوق.", type: "Cloud API", tags: ["Fast","Cheap","Production"], color: "#ec4899", link: "https://fireworks.ai" },
];

const INFERENCE: InfraItem[] = [
  {
    name: "vLLM", desc: "الأسرع للاستضافة الذاتية مع PagedAttention. يدعم OpenAI-compatible API.", type: "Inference Engine",
    tags: ["Fast","PagedAttention","OpenAI-compat","Multi-GPU"], color: "#e21227", link: "https://vllm.ai",
    config: `docker run -d --gpus all -p 8000:8000 \\
  -e MODEL_NAME=meta-llama/Llama-3.1-70B \\
  -e TENSOR_PARALLEL_SIZE=2 \\
  vllm/vllm-openai:latest`,
  },
  {
    name: "Text Generation Inference (TGI)", desc: "إطار HuggingFace للاستدلال. يدعم continuous batching و flash attention.", type: "Inference Engine",
    tags: ["HuggingFace","Flash Attention","Continuous Batching"], color: "#f59e0b", link: "https://github.com/huggingface/text-generation-inference",
    config: `docker run -d --gpus all -p 8080:80 \\
  -e MODEL_ID=meta-llama/Llama-3.1-70B \\
  -e NUM_SHARD=2 \\
  ghcr.io/huggingface/text-generation-inference:latest`,
  },
  {
    name: "Ollama", desc: "أسهل طريقة لتشغيل نماذج LLM محلياً على CPU أو GPU. يدعم 100+ نموذج.", type: "Local Engine",
    tags: ["Local","CPU","GPU","Developer-Friendly"], color: "#10b981", link: "https://ollama.com",
    config: `ollama serve &
ollama pull llama3.1:70b
ollama run qwen2.5:7b`,
  },
  {
    name: "TensorRT-LLM", desc: "NVIDIA محسّنة للغاية لـ H100/A100. تحقق أسرع استدلال ممكن على GPU.", type: "GPU Optimized",
    tags: ["NVIDIA","H100","A100","FP8 Quant"], color: "#6366f1", link: "https://github.com/NVIDIA/TensorRT-LLM",
    config: `{
  "model": "meta-llama/Llama-3.1-70B",
  "tensor_parallel": 2,
  "dtype": "fp16",
  "quantization": "fp8",
  "max_batch_size": 32
}`,
  },
  {
    name: "LM Studio", desc: "واجهة رسومية لتشغيل النماذج محلياً مع server API محلي متوافق مع OpenAI.", type: "Local GUI",
    tags: ["Desktop","GUI","OpenAI-compat","M1/M2"], color: "#8b5cf6", link: "https://lmstudio.ai",
    config: "LM_STUDIO_URL=http://localhost:1234/v1",
  },
];

const SECURITY_TOOLS: InfraItem[] = [
  {
    name: "Suricata IDS/IPS", desc: "نظام كشف التسلل وفحص الحزم العميق في الوقت الفعلي. يكتشف هجمات Prompt Injection عبر الشبكة.", type: "IDS/IPS",
    tags: ["IDS","IPS","DPI","Rules","Network"], color: "#e21227", link: "https://suricata.io",
    config: `alert http $EXTERNAL_NET any -> $AI_SERVERS any (
  msg:"AI: Prompt Injection Attempt";
  content:"ignore previous"; nocase;
  content:"instructions"; nocase;
  distance:0; within:50;
  sid:1000001; rev:1;
)`,
  },
  {
    name: "Zeek Network Analysis", desc: "تحليل حركة المرور الشبكي وإنشاء سجلات تفصيلية. مثالي لرصد استخدام AI API.", type: "Network Monitor",
    tags: ["Network","Logs","Analysis","Traffic"], color: "#f59e0b", link: "https://zeek.org",
    config: `# zeek-config/ai-monitor.zeek
event http_request(c: connection, method: string, url: string) {
  if (/\/api\/chat/ in url)
    Log::write(HTTP::LOG, [$uri=url, $method=method]);
}`,
  },
  {
    name: "ModSecurity WAF", desc: "جدار حماية تطبيقات الويب بقواعد OWASP CRS. يمنع SQLi وXSS وهجمات API.", type: "WAF",
    tags: ["WAF","OWASP","CRS","Nginx","Apache"], color: "#10b981", link: "https://modsecurity.org",
    config: `SecRule REQUEST_BODY "@rx ignore.{0,30}previous.{0,30}instructions" \\
  "id:10001,phase:2,block,msg:'Prompt Injection'"
SecRule REQUEST_BODY "@rx (drop|delete|truncate).{0,30}(table|database)" \\
  "id:10002,phase:2,block,msg:'SQL Attack in Prompt'"`,
  },
  {
    name: "AI Security Guard", desc: "طبقة حماية مدمجة في KaliGPT. تفحص كل رسالة بحثاً عن Prompt Injection وكلمات خطرة.", type: "Built-in",
    tags: ["Built-in","Prompt Injection","Rate Limit","Real-time"], color: "#6366f1",
    config: `// مدمج في artifacts/api-server/src/lib/ai-security-guard.ts
// يفحص: injection patterns, dangerous keywords, max length
// risk score 0-100 → يحجب إذا >= 90`,
  },
  {
    name: "AI Response Cache", desc: "نظام تخزين مؤقت متعدد المستويات L1/L2 لردود AI. يوفر التكلفة ويقلل زمن الاستجابة.", type: "Built-in",
    tags: ["Built-in","LRU","Cost Saving","Performance"], color: "#f97316",
    config: `// artifacts/api-server/src/lib/ai-cache.ts
// L1: Memory LRU (1000 entries, 1hr TTL)
// L2: Process-persistent (2000 entries, 24hr TTL)
// Hit rate analytics + cost tracking`,
  },
];

const MONITORING_TOOLS: InfraItem[] = [
  {
    name: "Prometheus", desc: "جمع وتخزين المقاييس في وقت الفعلي. يراقب الطلبات، الزمن، التوكنات، والأخطاء.", type: "Metrics",
    tags: ["Metrics","Time-series","Alerts","Scraping"], color: "#f97316", link: "https://prometheus.io",
    config: `scrape_configs:
  - job_name: 'kaligpt-ai'
    static_configs:
      - targets: ['api:8080']
    metrics_path: /metrics
    scrape_interval: 5s`,
  },
  {
    name: "Grafana", desc: "لوحات تحكم تفاعلية لتصور بيانات المراقبة. يتصل بـ Prometheus وLoki وJaeger.", type: "Visualization",
    tags: ["Dashboards","Visualization","Alerts","Reports"], color: "#f59e0b", link: "https://grafana.com",
    config: `dashboard: AI API Health
panels:
  - requests/sec per model
  - p95 latency by provider  
  - token usage vs budget
  - cache hit rate
  - error rate by endpoint`,
  },
  {
    name: "Loki", desc: "تجميع وتخزين السجلات بكفاءة عالية. يبحث في سجلات الدردشة والأخطاء فوراً.", type: "Logging",
    tags: ["Logs","Search","Streaming","Grafana"], color: "#e21227", link: "https://grafana.com/oss/loki",
    config: `promtail.yml:
  scrape_configs:
    - job_name: kaligpt-logs
      static_configs:
        - targets: ['localhost']
          labels: {job: api, __path__: /app/logs/*.log}`,
  },
  {
    name: "Jaeger / OpenTelemetry", desc: "تتبع الطلبات الموزعة عبر الخدمات. يُظهر مسار كل طلب من الواجهة للـ API للنموذج.", type: "Tracing",
    tags: ["Distributed Tracing","OTLP","Spans","Latency"], color: "#06b6d4", link: "https://jaegertracing.io",
    config: `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
OTEL_SERVICE_NAME=kaligpt-api
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1`,
  },
  {
    name: "ClickHouse Analytics", desc: "قاعدة بيانات تحليلية لمعالجة ملايين السجلات في ثوانٍ. تحليلات استخدام AI في الوقت الفعلي.", type: "Analytics DB",
    tags: ["OLAP","Analytics","Fast","Columnar"], color: "#10b981", link: "https://clickhouse.com",
    config: `CREATE TABLE ai_usage (
  timestamp DateTime64(3),
  user_id UUID,
  model String,
  tokens_input UInt32,
  tokens_output UInt32,
  latency_ms UInt32,
  cost_usd Decimal64(6)
) ENGINE = MergeTree()
ORDER BY (timestamp, model)
TTL timestamp + INTERVAL 90 DAY;`,
  },
];

const DATABASE_TOOLS: InfraItem[] = [
  {
    name: "PostgreSQL + pgvector", desc: "قاعدة بيانات علائقية مع دعم Vector Search. تخزن المحادثات والذاكرة الدلالية.", type: "Primary DB",
    tags: ["PostgreSQL","pgvector","Vector Search","Relations"], color: "#3b82f6", link: "https://github.com/pgvector/pgvector",
    config: `CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(100) NOT NULL,
  context_window INTEGER DEFAULT 128000,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX ON context_cache USING ivfflat 
  (summary_embedding vector_cosine_ops);`,
  },
  {
    name: "Qdrant Vector DB", desc: "قاعدة بيانات متجهات عالية الأداء للبحث الدلالي والـ RAG.", type: "Vector DB",
    tags: ["Vectors","Embeddings","RAG","Semantic Search"], color: "#8b5cf6", link: "https://qdrant.tech",
    config: `docker run -d -p 6333:6333 \\
  -v qdrant_storage:/qdrant/storage \\
  qdrant/qdrant:latest
  
# QDRANT_URL=http://localhost:6333`,
  },
  {
    name: "Redis Cache", desc: "تخزين مؤقت عالي السرعة للجلسات والمعدلات والاستجابات المؤقتة.", type: "Cache",
    tags: ["Cache","Sessions","Rate Limit","Fast"], color: "#e21227", link: "https://redis.io",
    config: `maxmemory 2gb
maxmemory-policy allkeys-lru
# Key naming:
# ai:context:{chat_id}
# ai:rate:{user_id}
# ai:response:{hash}`,
  },
  {
    name: "AI-Optimized Schema", desc: "هيكل قاعدة بيانات محسّن لمحادثات AI مع تتبع التوكنات والتكاليف.", type: "Schema",
    tags: ["Schema","Migrations","Cost Tracking","Tokens"], color: "#f59e0b",
    config: `-- ai_messages with cost tracking
tokens_input INTEGER,
tokens_output INTEGER,
tokens_total GENERATED ALWAYS AS (
  COALESCE(tokens_input,0) + COALESCE(tokens_output,0)
) STORED,
latency_ms INTEGER,
cost_usd DECIMAL(10,6),
finish_reason VARCHAR(50)`,
  },
];

const INFRA_TOOLS: InfraItem[] = [
  {
    name: "Terraform (IaC)", desc: "البنية التحتية ككود. ينشئ VPC وSubnets وGPU Instances وLoad Balancers تلقائياً.", type: "IaC",
    tags: ["AWS","GCP","Azure","Cloudflare","Auto-scaling"], color: "#6366f1", link: "https://terraform.io",
    config: `resource "aws_instance" "ai_inference" {
  ami           = "ami-deep-learning"
  instance_type = "p4d.24xlarge"  # A100 GPUs
  
  root_block_device {
    volume_size = 500
    volume_type = "gp3"
    iops        = 16000
  }
}

resource "aws_autoscaling_group" "ai_api" {
  min_size = 3
  max_size = 20
}`,
  },
  {
    name: "Ansible Playbook", desc: "أتمتة إعداد الخوادم وتثبيت التبعيات ونشر التطبيقات.", type: "Config Mgmt",
    tags: ["Automation","Config","Deploy","NVIDIA"], color: "#e21227", link: "https://ansible.com",
    config: `- name: Configure AI Servers
  tasks:
    - name: Apply sysctl performance tuning
      sysctl: name="{{ item.name }}" value="{{ item.value }}"
      
    - name: Install NVIDIA Container Toolkit
      apt: name=nvidia-container-toolkit state=present
      
    - name: Deploy KaliGPT API
      community.docker.docker_compose:
        project_src: /opt/kaligpt`,
  },
  {
    name: "Kubernetes + HPA", desc: "نشر تلقائي مع HorizontalPodAutoscaler. يُوسّع من 3 إلى 20 instance حسب الحمل.", type: "Orchestration",
    tags: ["K8s","HPA","Auto-scaling","Pods","Replicas"], color: "#06b6d4", link: "https://kubernetes.io",
    config: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`,
  },
  {
    name: "Traefik Proxy", desc: "موزع حمل سحابي مع TLS تلقائي و Let's Encrypt. يدعم Circuit Breaker وMiddlewares.", type: "Load Balancer",
    tags: ["TLS","Let's Encrypt","Docker","Middlewares"], color: "#10b981", link: "https://traefik.io",
    config: `traefik:
  command:
    - "--providers.docker=true"
    - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    - "--metrics.prometheus=true"
    - "--tracing.jaeger=true"`,
  },
  {
    name: "Nginx Load Balancer", desc: "موزع حمل عالي الأداء مع Rate Limiting وSSL Termination وCaching.", type: "Reverse Proxy",
    tags: ["Nginx","Rate Limit","SSL","Cache","Upstream"], color: "#8b5cf6", link: "https://nginx.org",
    config: `upstream ai_backends {
  least_conn;
  server ai-1:8080 weight=5;
  server ai-2:8080 weight=5;
  server ai-3:8080 backup;
  keepalive 32;
}

limit_req_zone $binary_remote_addr 
  zone=ai_limit:10m rate=10r/s;`,
  },
];

const PERFORMANCE: InfraItem[] = [
  {
    name: "Suricata AI Rules", desc: "قواعد IDS مخصصة للكشف عن هجمات Prompt Injection وتسريب API Keys عبر الشبكة.", type: "Network Security",
    tags: ["Suricata","Rules","Prompt Injection","API Key"], color: "#e21227",
    config: `alert http $EXTERNAL -> $AI_SERVERS any (
  msg:"AI: Prompt Injection"; sid:1000001;
)
alert http $AI_SERVERS -> $EXTERNAL any (
  msg:"AI: API Key Leak Detection";
  content:"sk-"; sid:1000003;
)`,
  },
  {
    name: "System Performance Tuning", desc: "ضبط kernel و TCP وGPU لأقصى أداء على خوادم AI.", type: "OS Tuning",
    tags: ["Kernel","TCP","GPU","Sysctl","NUMA"], color: "#f59e0b",
    config: `# Network tuning
sysctl -w net.core.rmem_max=134217728
sysctl -w net.ipv4.tcp_congestion_control=bbr

# GPU persistence (NVIDIA A100)
nvidia-smi -pm 1
nvidia-smi -ac 877,1530

# CPU performance mode
echo performance > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`,
  },
  {
    name: "CDN + Edge Caching", desc: "Cloudflare أو AWS CloudFront لتسريع الاستجابة. يخزن نتائج الـ API عند الحافة.", type: "CDN",
    tags: ["Cloudflare","CDN","Edge","Cache","Global"], color: "#f97316", link: "https://cloudflare.com",
    config: `location /api/models {
  proxy_cache ai_cache;
  proxy_cache_valid 200 5m;
  proxy_cache_use_stale error timeout updating;
}

location /api/chat/stream {
  proxy_buffering off;  # لـ SSE streaming
  proxy_read_timeout 300s;
}`,
  },
  {
    name: "Production Checklist", desc: "قائمة تحقق ما قبل الإنتاج لضمان الأمان والأداء والمراقبة.", type: "Checklist",
    tags: ["Checklist","Production","Security","Monitoring"], color: "#10b981",
    config: `## الأمان
[x] TLS 1.3 مفعل
[x] Rate limiting مُكوَّن
[x] WAF rules محملة
[x] AI Security Guard نشط

## الأداء  
[x] AI Response Cache
[x] Database indexes
[x] CDN configured

## المراقبة
[x] Prometheus + Grafana
[x] Loki logging
[x] Jaeger tracing
[x] Alerts مُكوَّنة`,
  },
];

const DATA: Record<TabId, InfraItem[]> = {
  models: MODELS,
  inference: INFERENCE,
  security: SECURITY_TOOLS,
  monitoring: MONITORING_TOOLS,
  database: DATABASE_TOOLS,
  infrastructure: INFRA_TOOLS,
  performance: PERFORMANCE,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
      style={{ background: copied ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)", color: copied ? "#10b981" : "#888" }}
    >
      {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
      {copied ? "تم النسخ" : "نسخ"}
    </button>
  );
}

function InfraCard({ item }: { item: InfraItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{ background: "#111", borderColor: "#222" }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="font-mono font-bold text-sm text-white">{item.name}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${item.color}22`, color: item.color }}>
            {item.type}
          </span>
        </div>
        <p className="text-xs leading-relaxed mb-3" style={{ color: "#aaa" }}>{item.desc}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#666" }}>{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {item.config && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: item.color }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "إخفاء Config" : "عرض Config"}
            </button>
          )}
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs ml-auto transition-opacity hover:opacity-80"
              style={{ color: "#555" }}
            >
              <ExternalLink size={11} />
              الموقع
            </a>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && item.config && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 rounded-lg overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "#1e1e1e" }}>
                <span className="text-xs font-mono" style={{ color: "#555" }}>config</span>
                <CopyButton text={item.config} />
              </div>
              <pre className="p-3 text-xs overflow-x-auto leading-relaxed" style={{ color: "#10b981", fontFamily: "monospace" }}>
                {item.config}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AIInfraModal({ isOpen, onClose }: AIInfraModalProps) {
  const [tab, setTab] = useState<TabId>("models");
  const [search, setSearch] = useState("");

  const items = DATA[tab];
  const filtered = search.trim()
    ? items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.desc.toLowerCase().includes(search.toLowerCase()) ||
        i.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        i.type.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", border: "1px solid #1f1f1f" }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#1f1f1f" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)" }}>
                <Server size={16} style={{ color: "#e21227" }} />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">AI Infrastructure Arsenal</h2>
                <p className="text-xs" style={{ color: "#555" }}>بنية تحتية AI متكاملة — نماذج · استدلال · أمن · مراقبة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.2)" }}>
                <Zap size={11} style={{ color: "#e21227" }} />
                <span className="text-xs font-mono" style={{ color: "#e21227" }}>NET_HACKE.MD</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
                <X size={18} style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="flex items-center gap-2 px-6 py-3 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "#1a1a1a" }}>
            <div className="flex gap-1 flex-shrink-0">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setSearch(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                    style={{
                      background: active ? "rgba(226,18,39,0.15)" : "transparent",
                      color: active ? "#e21227" : "#555",
                      border: active ? "1px solid rgba(226,18,39,0.3)" : "1px solid transparent",
                    }}
                  >
                    <Icon size={12} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative flex-shrink-0 ml-auto">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-40 px-3 py-1.5 text-xs rounded-lg outline-none"
                style={{ background: "#161616", border: "1px solid #262626", color: "#ccc" }}
              />
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 px-6 py-2 border-b flex-shrink-0" style={{ borderColor: "#111", background: "#0a0a0a" }}>
            <div className="flex items-center gap-1.5">
              <Box size={11} style={{ color: "#555" }} />
              <span className="text-xs" style={{ color: "#555" }}>{filtered.length} / {items.length} عنصر</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={11} style={{ color: "#555" }} />
              <span className="text-xs" style={{ color: "#555" }}>
                {TABS.find(t => t.id === tab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <AlertTriangle size={11} style={{ color: "#555" }} />
              <span className="text-xs" style={{ color: "#444" }}>للأغراض التعليمية والبيئات المرخصة فقط</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Eye size={32} style={{ color: "#333" }} />
                <p className="text-sm" style={{ color: "#555" }}>لا توجد نتائج للبحث</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(item => (
                  <InfraCard key={item.name} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: "#1a1a1a", background: "#0a0a0a" }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Server size={11} style={{ color: "#555" }} />
                <span className="text-xs" style={{ color: "#555" }}>9 نماذج AI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={11} style={{ color: "#555" }} />
                <span className="text-xs" style={{ color: "#555" }}>5 طبقات أمن</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity size={11} style={{ color: "#555" }} />
                <span className="text-xs" style={{ color: "#555" }}>5 أدوات مراقبة</span>
              </div>
            </div>
            <span className="text-xs font-mono" style={{ color: "#333" }}>KaliGPT AI Infrastructure v4.0</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AIInfraModal;
