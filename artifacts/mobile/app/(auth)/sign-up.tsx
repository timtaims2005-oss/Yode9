/**
 * MR7 AI — Sign Up Screen (Clerk Email/Password + Verification)
 */
import { useSignUp } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const isLoading = fetchStatus === 'fetching';

  const handleSignUp = async () => {
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl('/') as any);
        },
      });
    }
  };

  const styles = makeStyles(colors);

  // Email verification step
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>تحقق من بريدك</Text>
          <Text style={styles.subtitle}>أرسلنا رمزاً إلى {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="رمز التحقق"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            textAlign="right"
          />
          {errors.fields.code && (
            <Text style={styles.error}>{errors.fields.code.message}</Text>
          )}
          <Pressable
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>تأكيد</Text>}
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => signUp.verifications.sendEmailCode()}>
            <Text style={[styles.linkText, { color: colors.primary }]}>إعادة إرسال الرمز</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
            <Feather name="cpu" size={28} color={colors.primary} />
          </View>
          <Text style={styles.logoText}>MR7 AI</Text>
        </View>

        <Text style={styles.title}>إنشاء حساب</Text>
        <Text style={styles.subtitle}>انضم إلى MR7 AI اليوم</Text>

        <TextInput
          style={styles.input}
          placeholder="البريد الإلكتروني"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textAlign="right"
        />
        {errors.fields.emailAddress && (
          <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="كلمة المرور"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />
        {errors.fields.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}

        <Pressable
          style={[styles.btn, (!email || !password || isLoading) && styles.btnDisabled]}
          onPress={handleSignUp}
          disabled={!email || !password || isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>إنشاء حساب</Text>
          }
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>لديك حساب بالفعل؟ </Text>
          <Link href={"/(auth)/sign-in" as any}>
            <Text style={[styles.linkText, { color: colors.primary }]}>تسجيل الدخول</Text>
          </Link>
        </View>

        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    logoWrap: { alignItems: 'center', marginBottom: 40 },
    logoIcon: {
      width: 64, height: 64, borderRadius: 20,
      borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    logoText: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.text },
    title: { fontSize: 26, fontFamily: 'Inter_700Bold', color: colors.text, textAlign: 'right', marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'right', marginBottom: 28, fontFamily: 'Inter_400Regular' },
    input: {
      backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: colors.text, fontFamily: 'Inter_400Regular', marginBottom: 12,
    },
    btn: {
      backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15,
      alignItems: 'center', marginTop: 8,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    linkBtn: { alignItems: 'center', paddingVertical: 12 },
    linkText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
    error: { color: '#ef4444', fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8, textAlign: 'right' },
  });
}
