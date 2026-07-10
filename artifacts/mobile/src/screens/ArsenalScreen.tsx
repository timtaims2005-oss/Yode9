import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const TOOLS = [
  { id: "osint",    label: "OSINT",          icon: "search",       color: "#10b981" },
  { id: "shell",    label: "Shell Generator", icon: "terminal",     color: "#e21227" },
  { id: "malware",  label: "Malware Tools",   icon: "bug",          color: "#f97316" },
  { id: "darkweb",  label: "Dark Web Search", icon: "globe",        color: "#8b5cf6" },
  { id: "scanner",  label: "Port Scanner",    icon: "wifi",         color: "#0ea5e9" },
  { id: "cve",      label: "CVE Search",      icon: "warning",      color: "#f59e0b" },
  { id: "council",  label: "AI Council",      icon: "people",       color: "#e21227" },
  { id: "rag",      label: "RAGFlow",         icon: "documents",    color: "#3b82f6" },
];

export default function ArsenalScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Arsenal Hub</Text>
        <Text style={styles.sub}>أدوات الأمن السيبراني</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity key={tool.id} style={[styles.card, { borderColor: tool.color + "44" }]}>
            <View style={[styles.iconWrap, { backgroundColor: tool.color + "22" }]}>
              <Ionicons name={tool.icon as keyof typeof Ionicons.glyphMap} size={28} color={tool.color} />
            </View>
            <Text style={styles.cardLabel}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808" },
  header:    { padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f1f1f" },
  title:     { color: "#f0f0f0", fontSize: 20, fontWeight: "700" },
  sub:       { color: "#666", fontSize: 13, marginTop: 2 },
  grid:      { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  card:      { width: "46%", backgroundColor: "#161616", borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center", gap: 10 },
  iconWrap:  { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  cardLabel: { color: "#f0f0f0", fontSize: 13, fontWeight: "600", textAlign: "center" },
});
