import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetch } from 'expo/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';
import { useBaseUrl } from '@/hooks/useBaseUrl';

type Sector = { id: string; name: string; status: string; metric: string };
type EcosystemStatus = {
  engine: string;
  sectors: Sector[];
  providers: Record<string, boolean>;
  policy: { sensitiveActions: string; unavailableTEE: string };
};
type EcosystemRun = {
  runId: string;
  events: number;
  plan: { steps: string[]; risk: number };
  simulation: { safe: boolean; warnings: string[] };
  swarm: { workers: unknown[]; review?: unknown };
  traces: { stage: string; status: string }[];
  flywheelRecords: number;
  approval: string;
};

export default function EcosystemScreen() {
  const colors = useColors();
  const baseUrl = useBaseUrl();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<EcosystemStatus>();
  const [run, setRun] = useState<EcosystemRun>();
  const [goal, setGoal] = useState('Analyze the network telemetry and recommend a safe next action');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  const loadStatus = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      setError(undefined);
      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/ecosystem/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error(`Status request failed (${response.status})`);
      setStatus(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, getToken, isLoaded, isSignedIn]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const runEcosystem = async () => {
    if (!goal.trim() || running) return;
    setRunning(true);
    setError(undefined);
    try {
      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/ecosystem/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ goal: goal.trim(), packets: [{ id: 'mobile-operator', modality: 'text', source: 'mobile', payload: goal.trim(), timestamp: Date.now() }] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Run failed (${response.status})`);
      setRun(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  if (!isLoaded) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.centerText, { color: colors.textMuted }]}>Loading secure session…</Text></View>;
  }

  if (!isSignedIn) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Feather name="lock" size={28} color={colors.textMuted} /><Text style={[styles.centerText, { color: colors.text }]}>Sign in to open Ecosystem Control</Text><Text style={[styles.centerSubtext, { color: colors.textMuted }]}>The execution surface is protected by the same account session as chat.</Text></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.dot, { backgroundColor: '#35d9b2' }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: '#35d9b2' }]}>MR7 / AUTONOMOUS CONTROL</Text>
          <Text style={[styles.title, { color: colors.text }]}>Ecosystem</Text>
        </View>
        <Feather name="layers" size={22} color="#58c8ff" />
      </View>

      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: '#58c8ff33' }]}>
          <Text style={[styles.eyebrow, { color: '#58c8ff' }]}>TOTAL AUTONOMOUS ENGINE</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Run a governed mission</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>Ingest, simulate, coordinate, trace, and capture improvement data through the same ecosystem API used by the web app.</Text>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            multiline
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Mission objective"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable onPress={runEcosystem} disabled={running || !goal.trim()} style={({ pressed }) => [styles.runButton, { backgroundColor: '#58c8ff', opacity: running || !goal.trim() ? 0.5 : pressed ? 0.75 : 1 }]}>
            {running ? <ActivityIndicator color="#06101a" /> : <Feather name="play" size={16} color="#06101a" />}
            <Text style={styles.runText}>{running ? 'Running…' : 'Run ecosystem'}</Text>
          </Pressable>
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        </View>

        <View style={styles.stats}>
          {[
            ['ENGINE', status?.engine === 'ready' ? 'READY' : '—', 'cpu'],
            ['SECTORS', `${status?.sectors.length ?? 0} / 08`, 'grid'],
            ['TRACE', `${run?.traces.length ?? 0} events`, 'activity'],
            ['FLYWHEEL', `${run?.flywheelRecords ?? 0}`, 'refresh-cw'],
          ].map(([label, value, icon]) => (
            <View key={label} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={16} color="#58c8ff" />
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Eight sectors</Text>
        <View style={styles.sectors}>
          {(status?.sectors ?? []).map((sector) => {
            const attention = sector.status === 'attention';
            return (
              <View key={sector.id} style={[styles.sector, { backgroundColor: colors.card, borderColor: attention ? '#f59e0b55' : colors.border }]}>
                <View style={styles.sectorTop}>
                  <Feather name={attention ? 'alert-triangle' : 'check-circle'} size={16} color={attention ? '#f59e0b' : '#34d399'} />
                  <Text style={[styles.sectorStatus, { color: attention ? '#f59e0b' : '#34d399' }]}>{sector.status.toUpperCase()}</Text>
                </View>
                <Text style={[styles.sectorName, { color: colors.text }]}>{sector.name}</Text>
                <Text style={[styles.sectorMetric, { color: colors.textMuted }]}>{sector.metric}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Providers & policy</Text>
        <View style={[styles.providerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Object.entries(status?.providers ?? {}).map(([name, connected]) => (
            <View key={name} style={styles.providerRow}>
              <Text style={[styles.providerName, { color: colors.text }]}>{name}</Text>
              <Text style={{ color: connected ? '#34d399' : colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{connected ? 'CONNECTED' : 'NOT CONFIGURED'}</Text>
            </View>
          ))}
          <View style={[styles.policy, { borderTopColor: colors.border }]}>
            <Feather name="shield" size={15} color="#b48cff" />
            <Text style={[styles.policyText, { color: colors.textMuted }]}>Sensitive actions require approval. TEE absence is fail-closed.</Text>
          </View>
        </View>

        {run ? <View style={[styles.result, { backgroundColor: '#35d9b20d', borderColor: '#35d9b233' }]}><Text style={[styles.resultTitle, { color: '#35d9b2' }]}>RUN COMPLETED</Text><Text style={[styles.body, { color: colors.textMuted }]}>{run.plan.steps.length} plan steps · {run.swarm.workers.length} workers · approval: {run.approval}</Text></View> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 19, fontFamily: 'Inter_700Bold', marginTop: 3 },
  content: { padding: 16, gap: 14 },
  hero: { borderWidth: 1, borderRadius: 16, padding: 16 },
  heroTitle: { fontSize: 23, fontFamily: 'Inter_700Bold', marginTop: 8 },
  body: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_400Regular', marginTop: 7 },
  input: { minHeight: 82, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },
  runButton: { marginTop: 12, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  runText: { color: '#06101a', fontSize: 14, fontFamily: 'Inter_700Bold' },
  error: { fontSize: 12, marginTop: 10, fontFamily: 'Inter_400Regular' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  centerText: { fontSize: 16, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  centerSubtext: { fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', borderWidth: 1, borderRadius: 13, padding: 12 },
  statLabel: { fontSize: 9, letterSpacing: 1, marginTop: 12, fontFamily: 'Inter_600SemiBold' },
  statValue: { fontSize: 16, marginTop: 3, fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 11, letterSpacing: 1, fontFamily: 'Inter_700Bold', marginTop: 4 },
  sectors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sector: { width: '48%', borderWidth: 1, borderRadius: 13, padding: 12 },
  sectorTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectorStatus: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  sectorName: { fontSize: 13, marginTop: 12, fontFamily: 'Inter_600SemiBold' },
  sectorMetric: { fontSize: 11, marginTop: 4, fontFamily: 'Inter_400Regular' },
  providerCard: { borderWidth: 1, borderRadius: 13, padding: 14 },
  providerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  providerName: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  policy: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 12, marginTop: 6 },
  policyText: { flex: 1, fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  result: { borderWidth: 1, borderRadius: 13, padding: 14 },
  resultTitle: { fontSize: 11, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
});