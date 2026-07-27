/**
 * MR7 AI Chat Screen
 * Streams AI responses from the API server using expo/fetch SSE.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { fetch } from 'expo/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useBaseUrl } from '@/hooks/useBaseUrl';

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, colors }: { msg: Message; colors: ReturnType<typeof useColors> }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
          <Feather name="cpu" size={12} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderRadius: 18, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 },
          { maxWidth: '80%' },
        ]}
      >
        <Text style={[styles.bubbleText, { color: isUser ? '#fff' : colors.text }]}>
          {msg.content || (msg.streaming ? '' : '…')}
        </Text>
        {msg.streaming && (
          <View style={styles.cursorWrap}>
            <View style={[styles.cursor, { backgroundColor: colors.primary }]} />
          </View>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const colors = useColors();
  const baseUrl = useBaseUrl();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'مرحباً! أنا كالي، مساعدك الذكي. كيف يمكنني مساعدتك؟' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const abortRef = useRef<AbortController | null>(null);

  const uid = () => Date.now().toString() + Math.random().toString(36).slice(2, 8);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: uid(), role: 'user', content: text };
    const assistantId = uid();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

    const snapshot = [...messages, userMsg];
    setMessages([...snapshot, assistantMsg]);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          stream: true,
          messages: snapshot.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data) as { type?: string; content?: string; delta?: string };
            const token = parsed.content ?? parsed.delta ?? '';
            if (token) {
              accumulated += token;
              const captured = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: captured, streaming: true } : m
                )
              );
            }
          } catch {
            // non-JSON SSE line — skip
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'حدث خطأ في الاتصال بالخادم. تأكد من تشغيل الخادم.', streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, baseUrl]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
    }
  }, [messages.length]);

  const keyExtractor = useCallback((item: Message) => item.id, []);
  const renderItem = useCallback(
    ({ item }: { item: Message }) => <Bubble msg={item} colors={colors} />,
    [colors]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.headerDot, { backgroundColor: '#34d399' }]} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>KaliGPT</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>مساعد MR7</Text>
      </View>

      {/* Messages — inverted FlatList */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={[styles.list, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              // The tab bar is positioned absolutely, so reserve its height in
              // addition to the device safe-area inset. Without this clearance
              // the composer sits underneath the navigation buttons.
              paddingBottom: Math.max(insets.bottom + 72, 84),
            },
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="اكتب رسالتك…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            textAlign="right"
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary, opacity: !input.trim() || loading ? 0.4 : pressed ? 0.8 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  cursorWrap: { marginTop: 4, flexDirection: 'row' },
  cursor: { width: 2, height: 16, borderRadius: 1, opacity: 0.9 },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
