/**
 * MR7 AI — Sign In Screen (Clerk Email/Password)
 */
import { useSignIn } from '@clerk/expo';
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

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const isLoading = fetchStatus === 'fetching';

  const handleSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl('/') as any);
        },
      });
    } else if (signIn.status === 'needs_client_trust') {
      await signIn.mfa.sendEmailCode();
    }
  };

  const handleVerifyMFA = async () => {
    await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl('/') as any);
        },
      });
    }
  };

  const styles = makeStyles(colors);

  if (signIn.status === 'needs_client_trust') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>التحقق من هويتك</Text>
          <Text style={styles.subtitle}>أدخل الرمز المرسل إلى بريدك الإلكتروني</Text>
          <TextInput
            style={styles.input}
            placeholder="رمز التحقق"
            placeholderTextColor={colors.textMuted}
            value={verifyCode}
            onChangeText={setVerifyCode}
            keyboardType="numeric"
            textAlign="right"
          />
          {errors.fields.code && (
            <Text style={styles.error}>{errors.fields.code.message}</Text>
          )}
          <Pressable
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleVerifyMFA}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>تأكيد</Text>}
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => signIn.mfa.sendEmailCode()}>
            <Text style={styles.linkText}>إعادة إرسال الرمز</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => signIn.reset()}>
            <Text style={styles.linkText}>العودة</Text>
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
        {/* Logo / Brand */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
            <Feather name="cpu" size={28} color={colors.primary} />
          </View>
          <Text style={styles.logoText}>MR7 AI</Text>
        </View>

        <Text style={styles.title}>تسجيل الدخول</Text>
        <Text style={styles.subtitle}>مرحباً بك مجدداً</Text>

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
        {errors.fields.identifier && (
          <Text style={styles.error}>{errors.fields.identifier.message}</Text>
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
          onPress={handleSignIn}
          disabled={!email || !password || isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>دخول</Text>
          }
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>ليس لديك حساب؟ </Text>
          <Link href={"/(auth)/sign-up" as any}>
            <Text style={[styles.linkText, { color: colors.primary }]}>إنشاء حساب</Text>
          </Link>
        </View>
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
    linkText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
    error: { color: '#ef4444', fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8, textAlign: 'right' },
  });
}
