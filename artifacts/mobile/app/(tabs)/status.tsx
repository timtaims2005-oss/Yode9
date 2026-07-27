/**
 * MR7 System Status Monitor
 * Live health check of all API server services and queues.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useBaseUrl } from '@/hooks/useBaseUrl';

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceStatus = 'healthy' | 'degraded' | 'error' | 'unknown';

interface ServiceInfo {
  status: ServiceStatus;
  latency?: number;
  message?: string;
}

interface StatusData {
  status: ServiceStatus;
  uptime?: number;
  services?: Record<string, ServiceInfo>;
  timestamp?: string;
}

interface QueueInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ServiceStatus, string> = {
  healthy: '#34d399',
  degraded: '#f59e0b',
  error: '#ef4444',
  unknown: '#7368a0',
};

const STATUS_ICON: Record<ServiceStatus, string> = {
  healthy: 'check-circle',
  degraded: 'alert-triangle',
  error: 'x-circle',
  unknown: 'help-circle',
};

function fmt(ms?: number) {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtUptime(s?: number) {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Service card ──────────────────────────────────────────────────────────────
function ServiceCard({
  name,
  info,
  colors,
}: {
  name: string;
  info: ServiceInfo;
  colors: ReturnType<typeof useColors>;
}) {
  const c = STATUS_COLOR[info.status];
  const icon = STATUS_ICON[info.status] as React.ComponentProps<typeof Feather>['name'];
  return (
    <View style={[styles.serviceCard, { backgroundColor: c + '0d', borderColor: c + '33' }]}>
      <View style={styles.serviceRow}>
        <View style={[styles.serviceIconWrap, { backgroundColor: c + '22' }]}>
          <Feather name={icon} size={14} color={c} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serviceName, { color: colors.text }]}>{name}</Text>
          {info.message ? (
            <Text style={[styles.serviceMsg, { color: colors.textMuted }]} numberOfLines={1}>
              {info.message}
            </Text>
          ) : null}
        </View>
        {info.latency !== undefined && (
          <Text style={[styles.serviceLatency, { color: c }]}>{fmt(info.latency)}</Text>
        )}
      </View>
    </View>
  );
}

// ── Queue card ────────────────────────────────────────────────────────────────
function QueueCard({ q, colors }: { q: QueueInfo; colors: ReturnType<typeof useColors> }) {
  const hasActive = q.active > 0;
  const hasFailed = q.failed > 0;
  const c = hasFailed ? '#ef4444' : hasActive ? '#e21227' : '#34d399';
  return (
    <View style={[styles.queueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.queueHeader}>
        <View style={[styles.queueDot, { backgroundColor: c }]} />
        <Text style={[styles.queueName, { color: colors.text }]}>{q.name}</Text>
        {hasActive && <ActivityIndicator size="small" color={c} style={{ marginLeft: 6 }} />}
      </View>
      <View style={styles.queueStats}>
        {[
          { label: 'انتظار', val: q.waiting, c: colors.textMuted },
          { label: 'نشط', val: q.active, c: '#e21227' },
          { label: 'مكتمل', val: q.completed, c: '#34d399' },
          { label: 'فشل', val: q.failed, c: '#ef4444' },
        ].map(({ label, val, c: sc }) => (
          <View key={label} style={styles.queueStat}>
            <Text style={[styles.queueStatVal, { color: sc }]}>{val}</Text>
            <Text style={[styles.queueStatLabel, { color: colors.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatusScreen() {
  const colors = useColors();
  const baseUrl = useBaseUrl();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const spinIcon = useCallback(() => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [spinAnim]);

  const fetch_ = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      spinIcon();
      try {
        const [statusRes, queuesRes] = await Promise.all([
          fetch(`${baseUrl}/api/health/status`, { signal: AbortSignal.timeout(8000) }),
          fetch(`${baseUrl}/api/health/queues`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
        ]);

        if (statusRes.ok) {
          const data = (await statusRes.json()) as StatusData;
          setStatus(data);
          setError(null);
        } else {
          setError(`خطأ ${statusRes.status}`);
        }

        if (queuesRes?.ok) {
          const qData = (await queuesRes.json()) as { queues?: QueueInfo[] } | QueueInfo[];
          const arr = Array.isArray(qData) ? qData : qData.queues ?? [];
          setQueues(arr);
        }
        setLastUpdated(new Date());
        setCountdown(30);
      } catch {
        setError('تعذّر الاتصال بالخادم');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [baseUrl, spinIcon]
  );

  // Auto-refresh every 30s
  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(() => fetch_(true), 30_000);
    countdownRef.current = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 30)), 1_000);
    return () => {
      clearInterval(timerRef.current!);
      clearInterval(countdownRef.current!);
    };
  }, [fetch_]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch_(true);
  }, [fetch_]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const overallColor = status ? STATUS_COLOR[status.status] : colors.textMuted;
  const overallIcon = status ? STATUS_ICON[status.status] : 'loader';
  const services = status?.services ? Object.entries(status.services) : [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>حالة النظام</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {lastUpdated
              ? `آخر تحديث: ${lastUpdated.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
              : 'جارٍ التحميل…'}
          </Text>
        </View>
        <Pressable
          onPress={() => fetch_()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="refresh-cw" size={20} color={colors.primary} />
          </Animated.View>
        </Pressable>
        <View style={[styles.countdownBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.countdownText, { color: colors.textMuted }]}>{countdown}s</Text>
        </View>
      </View>

      {loading && !status ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>جارٍ الفحص…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Feather name="wifi-off" size={40} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
          <Pressable
            onPress={() => fetch_()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Overall status pill */}
          <View style={styles.overallWrap}>
            <View
              style={[styles.overallPill, { backgroundColor: overallColor + '18', borderColor: overallColor + '44' }]}
            >
              <Feather
                name={overallIcon as React.ComponentProps<typeof Feather>['name']}
                size={20}
                color={overallColor}
              />
              <Text style={[styles.overallText, { color: overallColor }]}>
                {status?.status === 'healthy'
                  ? 'جميع الأنظمة تعمل'
                  : status?.status === 'degraded'
                  ? 'أداء منخفض'
                  : status?.status === 'error'
                  ? 'حالة خطأ'
                  : 'غير معروف'}
              </Text>
              {status?.uptime !== undefined && (
                <Text style={[styles.overallSub, { color: overallColor + '99' }]}>
                  وقت التشغيل: {fmtUptime(status.uptime)}
                </Text>
              )}
            </View>
          </View>

          {/* Services */}
          {services.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>الخدمات</Text>
              <View style={styles.servicesGrid}>
                {services.map(([name, info]) => (
                  <ServiceCard key={name} name={name} info={info as ServiceInfo} colors={colors} />
                ))}
              </View>
            </View>
          )}

          {/* Queues */}
          {queues.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>الطوابير (BullMQ)</Text>
              {queues.map((q) => (
                <QueueCard key={q.name} q={q} colors={colors} />
              ))}
            </View>
          )}

          {/* Empty state */}
          {services.length === 0 && queues.length === 0 && (
            <View style={styles.centerBox}>
              <Feather name="activity" size={40} color={colors.textMuted} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>لا توجد بيانات</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  countdownText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  loadingText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  overallWrap: { padding: 16 },
  overallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  overallText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', flex: 1 },
  overallSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  servicesGrid: { gap: 8 },
  serviceCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  serviceMsg: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  serviceLatency: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  queueCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  queueDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  queueName: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', flex: 1 },
  queueStats: { flexDirection: 'row', justifyContent: 'space-around' },
  queueStat: { alignItems: 'center', gap: 2 },
  queueStatVal: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  queueStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});
