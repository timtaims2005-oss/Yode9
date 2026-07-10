import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const API_URL = (process.env.API_URL ?? "https://mr7.ai/api");

interface Message {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  ts:      number;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          model:    "gpt-4o",
          stream:   false,
        }),
      });
      const data = await resp.json() as { content?: string; choices?: Array<{ message: { content: string } }> };
      const content =
        data.content ??
        data.choices?.[0]?.message?.content ??
        "No response.";
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content, ts: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Connection error. Check your network.", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
      <Text style={styles.bubbleText}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>mr7.ai</Text>
        <Text style={styles.headerSub}>KaliGPT</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield" size={64} color="#e21227" />
            <Text style={styles.emptyText}>KaliGPT جاهز</Text>
            <Text style={styles.emptySubText}>اكتب سؤالك أو أمرك في الأسفل</Text>
          </View>
        }
      />

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#e21227" />
          <Text style={styles.typingText}>KaliGPT يكتب...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="اكتب رسالتك..."
            placeholderTextColor="#555"
            multiline
            maxLength={4096}
            onSubmitEditing={send}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={loading}>
            <Ionicons name="send" size={20} color={loading ? "#555" : "#e21227"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#080808" },
  header:       { padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f1f1f", flexDirection: "row", alignItems: "baseline", gap: 8 },
  headerTitle:  { color: "#e21227", fontSize: 20, fontWeight: "700" },
  headerSub:    { color: "#666", fontSize: 13 },
  list:         { padding: 12, paddingBottom: 4 },
  bubble:       { maxWidth: "85%", padding: 12, borderRadius: 12, marginVertical: 4 },
  userBubble:   { backgroundColor: "#1a0608", borderColor: "#e21227", borderWidth: 1, alignSelf: "flex-end" },
  aiBubble:     { backgroundColor: "#161616", borderColor: "#262626", borderWidth: 1, alignSelf: "flex-start" },
  bubbleText:   { color: "#f0f0f0", fontSize: 14, lineHeight: 20 },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, gap: 12 },
  emptyText:    { color: "#f0f0f0", fontSize: 20, fontWeight: "600" },
  emptySubText: { color: "#666", fontSize: 14 },
  typingRow:    { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  typingText:   { color: "#666", fontSize: 13 },
  inputRow:     { flexDirection: "row", alignItems: "flex-end", padding: 12, borderTopWidth: 1, borderTopColor: "#1f1f1f", gap: 8 },
  input:        { flex: 1, backgroundColor: "#161616", color: "#f0f0f0", borderRadius: 12, borderWidth: 1, borderColor: "#262626", padding: 12, maxHeight: 120, fontSize: 14 },
  sendBtn:      { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#161616", borderRadius: 12, borderWidth: 1, borderColor: "#262626" },
});
