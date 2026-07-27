import type { ComponentType } from 'react';
import {
  MessageSquare,
  Shield,
  Zap,
  Brain,
  LayoutGrid,
  Terminal,
  Search,
  Settings,
  Activity,
  Lock,
  Code2,
  Database,
  Cpu,
  Globe,
  Eye,
  Swords,
  BarChart3,
  Users,
  Key,
  Bell,
  type LucideIcon,
} from 'lucide-react';

// ── Feature registry entry ───────────────────────────────────────────────────
export interface FeatureEntry {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: LucideIcon;
  category: 'core' | 'security' | 'ai' | 'tools' | 'admin';
  badge?: string;
  isNew?: boolean;
  requiresAdmin?: boolean;
  component?: () => Promise<{ default: ComponentType }>;
}

// ── Static feature list ───────────────────────────────────────────────────────
const FEATURES: FeatureEntry[] = [
  // Core
  {
    id: 'chat',
    name: 'Chat',
    nameAr: 'الدردشة',
    description: 'AI chat with multi-provider support',
    icon: MessageSquare,
    category: 'core',
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    nameAr: 'لوحة التحكم',
    description: 'Real-time system metrics and status',
    icon: LayoutGrid,
    category: 'core',
  },
  {
    id: 'terminal',
    name: 'AI Terminal',
    nameAr: 'الطرفية',
    description: 'Intelligent terminal with AI assistance',
    icon: Terminal,
    category: 'core',
  },

  // AI
  {
    id: 'ai-orchestrator',
    name: 'AI Orchestrator',
    nameAr: 'منسق الذكاء الاصطناعي',
    description: 'Multi-model AI with circuit breakers',
    icon: Brain,
    category: 'ai',
    isNew: true,
    badge: 'NEW',
  },
  {
    id: 'code-sandbox',
    name: 'Code Sandbox',
    nameAr: 'بيئة التنفيذ المعزولة',
    description: 'Isolated code execution environment',
    icon: Code2,
    category: 'ai',
    isNew: true,
    badge: 'ULTRA',
  },
  {
    id: 'rag',
    name: 'RAG System',
    nameAr: 'نظام RAG',
    description: 'Retrieval-augmented generation',
    icon: Database,
    category: 'ai',
  },
  {
    id: 'agents',
    name: 'Agent Swarm',
    nameAr: 'سرب العملاء',
    description: 'Autonomous AI agent orchestration',
    icon: Cpu,
    category: 'ai',
    badge: 'v6.0',
  },

  // Security
  {
    id: 'crypto',
    name: 'Military Crypto',
    nameAr: 'التشفير العسكري',
    description: 'AES-256-GCM military-grade encryption',
    icon: Lock,
    category: 'security',
    isNew: true,
    badge: 'AES-256',
  },
  {
    id: 'threat-intel',
    name: 'Threat Intel',
    nameAr: 'استخبارات التهديدات',
    description: 'Real-time threat intelligence feeds',
    icon: Shield,
    category: 'security',
  },
  {
    id: 'osint',
    name: 'OSINT',
    nameAr: 'المعلومات المفتوحة',
    description: 'Open-source intelligence gathering',
    icon: Search,
    category: 'security',
  },
  {
    id: 'pentest',
    name: 'Pentest Lab',
    nameAr: 'مختبر الاختراق',
    description: 'Penetration testing toolkit',
    icon: Swords,
    category: 'security',
  },
  {
    id: 'security-compliance',
    name: 'Compliance',
    nameAr: 'الامتثال',
    description: 'Security compliance monitoring',
    icon: Eye,
    category: 'security',
  },

  // Tools
  {
    id: 'analytics',
    name: 'Analytics',
    nameAr: 'التحليلات',
    description: 'Usage analytics and insights',
    icon: BarChart3,
    category: 'tools',
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    nameAr: 'المراقبة',
    description: 'System health monitoring',
    icon: Activity,
    category: 'tools',
  },
  {
    id: 'api-keys',
    name: 'API Keys',
    nameAr: 'مفاتيح API',
    description: 'Manage API access keys',
    icon: Key,
    category: 'tools',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    nameAr: 'الإشعارات',
    description: 'Alert and notification management',
    icon: Bell,
    category: 'tools',
  },

  // Admin
  {
    id: 'admin',
    name: 'Admin',
    nameAr: 'الإدارة',
    description: 'System administration panel',
    icon: Settings,
    category: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'organizations',
    name: 'Organizations',
    nameAr: 'المنظمات',
    description: 'Multi-tenant organization management',
    icon: Users,
    category: 'admin',
  },
  {
    id: 'global',
    name: 'Global Status',
    nameAr: 'الحالة العالمية',
    description: 'Global system status',
    icon: Globe,
    category: 'admin',
  },
];

// ── Registry API ─────────────────────────────────────────────────────────────
class FeatureRegistryClass {
  private readonly features = new Map<string, FeatureEntry>(
    FEATURES.map((f) => [f.id, f]),
  );

  /** Get a feature by ID */
  get(id: string): FeatureEntry | undefined {
    return this.features.get(id);
  }

  /** List all features */
  list(category?: FeatureEntry['category']): FeatureEntry[] {
    const all = Array.from(this.features.values());
    return category ? all.filter((f) => f.category === category) : all;
  }

  /** Register a new feature dynamically */
  register(feature: FeatureEntry): void {
    this.features.set(feature.id, feature);
  }

  /** Group features by category */
  byCategory(): Record<string, FeatureEntry[]> {
    return this.list().reduce(
      (acc, f) => {
        (acc[f.category] ??= []).push(f);
        return acc;
      },
      {} as Record<string, FeatureEntry[]>,
    );
  }

  /** Search features by name */
  search(query: string): FeatureEntry[] {
    const q = query.toLowerCase();
    return this.list().filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.nameAr.includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }
}

export const FeatureRegistry = new FeatureRegistryClass();
