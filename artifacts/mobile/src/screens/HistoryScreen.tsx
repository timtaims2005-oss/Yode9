import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>المحادثات</Text>
      </View>
      <View style={styles.empty}>
        <Ionicons name="time-outline" size={48} color="#333" />
        <Text style={styles.emptyText}>لا توجد محادثات محفوظة</Text>
        <Text style={styles.emptySubText}>ابدأ محادثة جديدة من تبويب Chat</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#080808" },
  header:       { padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f1f1f" },
  title:        { color: "#f0f0f0", fontSize: 20, fontWeight: "700" },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText:    { color: "#666", fontSize: 16 },
  emptySubText: { color: "#444", fontSize: 13 },
});
