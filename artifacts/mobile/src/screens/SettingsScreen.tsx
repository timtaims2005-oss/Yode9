import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const [darkMode,      setDarkMode]      = useState(true);
  const [streamingMode, setStreamingMode] = useState(true);
  const [arabicUI,      setArabicUI]      = useState(true);

  const Setting = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#333", true: "#e2122733" }}
        thumbColor={value ? "#e21227" : "#666"}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الإعدادات</Text>
      </View>
      <ScrollView>
        <Text style={styles.section}>المظهر</Text>
        <Setting label="الوضع الداكن"      value={darkMode}      onToggle={() => setDarkMode(v => !v)} />
        <Setting label="واجهة عربية"        value={arabicUI}      onToggle={() => setArabicUI(v => !v)} />
        <Setting label="البث الفوري (SSE)"  value={streamingMode} onToggle={() => setStreamingMode(v => !v)} />

        <Text style={styles.section}>الحساب</Text>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL("https://mr7.ai")}>
          <Text style={styles.rowLabel}>فتح الموقع الكامل</Text>
          <Ionicons name="open-outline" size={18} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL("https://t.me/mr7ai_support")}>
          <Text style={styles.rowLabel}>الدعم الفني</Text>
          <Ionicons name="send" size={18} color="#666" />
        </TouchableOpacity>

        <Text style={styles.version}>mr7.ai v1.0.0 — KaliGPT Mobile</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808" },
  header:    { padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f1f1f" },
  title:     { color: "#f0f0f0", fontSize: 20, fontWeight: "700" },
  section:   { color: "#e21227", fontSize: 12, fontWeight: "700", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, letterSpacing: 1 },
  row:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#111" },
  rowLabel:  { color: "#f0f0f0", fontSize: 15 },
  version:   { color: "#333", fontSize: 12, textAlign: "center", padding: 32 },
});
