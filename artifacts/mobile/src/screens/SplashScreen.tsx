import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 5,   useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Ionicons name="shield" size={80} color="#e21227" />
        <Text style={styles.title}>mr7.ai</Text>
        <Text style={styles.sub}>KaliGPT — الذكاء الاصطناعي للأمن السيبراني</Text>
      </Animated.View>
      <Text style={styles.loader}>جاري التحميل...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808", alignItems: "center", justifyContent: "center" },
  content:   { alignItems: "center", gap: 16 },
  title:     { color: "#e21227", fontSize: 40, fontWeight: "800", letterSpacing: 2 },
  sub:       { color: "#666", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  loader:    { position: "absolute", bottom: 60, color: "#444", fontSize: 13 },
});
