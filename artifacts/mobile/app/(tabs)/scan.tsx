/**
 * OSINT Scanner Screen
 * Runs real DNS recon, web scan, email OSINT, and deep search via the API.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBaseUrl } from '@/hooks/useBaseUrl';

type ScanType = 'dns' | 'web' | 'email' | 'deep';

interface ScanResult {
  id: string;
  type: ScanType;
  target: string;
  riskLevel?: string;
  riskScore?: number;
  summary: string;
  timestamp: number;
  raw: unknown;
}

const SCAN_BUTTONS: { type: ScanType; label: string; icon: keyof typeof Feather.glyphMap; color: string; desc: string }[] = [
  { type: 'dns',   label: 'DNS Recon',    icon: 'globe',     color: '#3b82f6', desc: 'Domain DNS records' },
  { type: 'web',   label: 'Web Scan',     icon: 'shield',    color: '#10b981', desc: 'HTTP headers & SSL' },
  { type: 'email', label: 'Email OSINT',  icon: 'mail',      color: '#8b5cf6', desc: 'Leak & MX check' },
  { type: 'deep',  label: 'Deep Search',  icon: 'search',    color: '#e21227', desc: 'Full OSINT profile' },
];

const RISK_COLORS: Record<string, string> = {
  critical: '#e21227', high: '#f97316', medium: '#fbbf24', low: '#10b981',
};

function summarize(type: ScanType, data: unknown): string {
  if (!data || typeof data !== 'object') return 'No data returned';
  const d = data as Record<string, unknown>;
  switch (type) {
    case 'dns': {
      const sources = d.sources as Record<string, unknown> | undefined;
      const sourceCount = sources ? Object.keys(sources).filter(k => (sources[k] as { success?: boolean })?.success).length : 0;
      return `${sourceCount} DNS sources checked • Risk: ${(d.riskLevel as string) ?? 'N/A'}`;
    }
    case 'web': {
      const results = d.results as Record<string, unknown> | undefined;
      return results ? `Status checked • Risk: ${(d.riskLevel as string) ?? 'N/A'}` : 'Scan complete';
    }
    case 'email': {
      const results = d.results as Record<string, unknown> | undefined;
      const leakFound = (results?.leakFound as number) ?? 0;
      return leakFound > 0 ? `⚠ ${leakFound} breaches found • Risk: ${(d.riskLevel as string) ?? 'high'}` : `✓ No breaches • Risk: ${(d.riskLevel as string) ?? 'low'}`;
    }
    case 'deep': {
      const breaches = (d.breaches as unknown[])?.length ?? 0;
      const profiles = (d.socialProfiles as unknown[])?.length ?? 0;
      return `${breaches} breaches, ${profiles} profiles • Score: ${(d.riskScore as number) ?? 0}/100`;
    }
    default: return 'Scan complete';
  }
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const baseUrl = useBaseUrl();
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeScan, setActiveScan] = useState<ScanType | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runScan = useCallback(async (type: ScanType) => {
    if (!target.trim()) { Alert.alert('Target Required', 'Enter an IP address, domain, or email first.'); return; }
    setLoading(true);
    setActiveScan(type);
    try {
      let endpoint = '';
      let body: Record<string, string> = {};
      switch (type) {
        case 'dns':
          endpoint = '/api/osint/domain';
          body = { value: target.trim() };
          break;
        case 'web':
          endpoint = '/api/osint/url';
          body = { value: target.trim().startsWith('http') ? target.trim() : `https://${target.trim()}` };
          break;
        case 'email':
          endpoint = '/api/osint/email';
          body = { value: target.trim() };
          break;
        case 'deep':
          endpoint = '/api/deep-search';
          const t = target.trim();
          const dtype = t.includes('@') ? 'email' : /^\+?\d{7,}$/.test(t) ? 'phone' : t.includes(' ') ? 'fullname' : 'username';
          body = { query: t, type: dtype };
          break;
      }
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as Record<string, unknown>;
      const id = `${type}-${Date.now()}`;
      setResults(prev => [{
        id, type, target: target.trim(),
        riskLevel: (data.riskLevel as string) ?? undefined,
        riskScore: (data.riskScore as number) ?? undefined,
        summary: summarize(type, data),
        timestamp: Date.now(),
        raw: data,
      }, ...prev].slice(0, 15));
      setExpanded(id);
    } catch (e) {
      Alert.alert('Scan Error', `Failed to connect to the API server.\n${String(e)}`);
    }
    setLoading(false);
    setActiveScan(null);
  }, [target, baseUrl]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: '#e21227' + '22' }]}>
          <Feather name="crosshair" size={18} color="#e21227" />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>OSINT Scanner</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Defensive intelligence gathering</Text>
        </View>
      </View>

      {/* Input */}
      <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="target" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="IP, domain, email, username..."
          placeholderTextColor={colors.textMuted}
          value={target}
          onChangeText={setTarget}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="search"
          onSubmitEditing={() => runScan('deep')}
        />
        {target.length > 0 && (
          <Pressable onPress={() => setTarget('')} style={styles.clearBtn}>
            <Feather name="x" size={13} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Scan type buttons */}
      <View style={styles.buttonGrid}>
        {SCAN_BUTTONS.map(btn => {
          const isActive = loading && activeScan === btn.type;
          return (
            <Pressable
              key={btn.type}
              onPress={() => runScan(btn.type)}
              disabled={loading}
              style={({ pressed }) => [
                styles.scanBtn,
                { backgroundColor: btn.color + (pressed ? '33' : '18'), borderColor: btn.color + '40', opacity: loading && activeScan !== btn.type ? 0.5 : 1 },
              ]}
            >
              {isActive
                ? <ActivityIndicator size="small" color={btn.color} />
                : <Feather name={btn.icon} size={14} color={btn.color} />}
              <View>
                <Text style={[styles.scanBtnLabel, { color: btn.color }]}>{btn.label}</Text>
                <Text style={[styles.scanBtnDesc, { color: btn.color + 'aa' }]}>{btn.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Results */}
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {results.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Feather name="shield" size={40} color={colors.textMuted} style={{ marginBottom: 12, opacity: 0.4 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to scan</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Enter a target and choose a scan type above</Text>
          </View>
        )}

        {results.map(r => {
          const isOpen = expanded === r.id;
          const riskColor = RISK_COLORS[r.riskLevel ?? 'low'] ?? '#10b981';
          return (
            <Pressable key={r.id} onPress={() => setExpanded(isOpen ? null : r.id)} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: isOpen ? riskColor + '44' : colors.border }]}>
              <View style={styles.resultHeader}>
                <View style={styles.resultMeta}>
                  <View style={[styles.typeChip, { backgroundColor: SCAN_BUTTONS.find(b => b.type === r.type)?.color + '22' }]}>
                    <Text style={[styles.typeChipText, { color: SCAN_BUTTONS.find(b => b.type === r.type)?.color }]}>
                      {r.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.targetText, { color: colors.text }]} numberOfLines={1}>{r.target}</Text>
                </View>
                <View style={styles.resultRight}>
                  {r.riskLevel && (
                    <View style={[styles.riskBadge, { backgroundColor: riskColor + '22' }]}>
                      <Text style={[styles.riskText, { color: riskColor }]}>{r.riskLevel.toUpperCase()}</Text>
                    </View>
                  )}
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
                </View>
              </View>
              <Text style={[styles.summaryText, { color: colors.textMuted }]}>{r.summary}</Text>
              {isOpen && (
                <View style={[styles.rawData, { borderTopColor: colors.border }]}>
                  <Text style={[styles.rawLabel, { color: colors.textMuted }]}>Raw Response</Text>
                  <Text style={[styles.rawText, { color: colors.secondary ?? colors.textMuted }]}>
                    {JSON.stringify(r.raw, null, 2).slice(0, 1500)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingHorizontal: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  headerIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:     { fontSize: 11, marginTop: 1 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  input:        { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  clearBtn:     { padding: 4 },
  buttonGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  scanBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, width: '48%' },
  scanBtnLabel: { fontSize: 12, fontWeight: '700' },
  scanBtnDesc:  { fontSize: 10, marginTop: 1 },
  results:      { flex: 1 },
  emptyState:   { alignItems: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub:     { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  resultCard:   { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resultMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  typeChip:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeChipText: { fontSize: 9, fontWeight: '800' },
  targetText:   { fontSize: 13, fontWeight: '600', flex: 1 },
  resultRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  riskBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  riskText:     { fontSize: 9, fontWeight: '800' },
  summaryText:  { fontSize: 11, lineHeight: 16 },
  rawData:      { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  rawLabel:     { fontSize: 9, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  rawText:      { fontSize: 9, fontFamily: 'monospace', lineHeight: 14 },
});
