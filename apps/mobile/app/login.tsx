import { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../src/theme/ThemeContext';

export default function LoginScreen() {
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login failed', 'We could not sign you in. Check your email and password.');
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* Back button */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.text }]}>← Back</Text>
          </Pressable>

          <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Log In</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Welcome back to CSUN Connect
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>CSUN Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
            />

            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
            />

            <Pressable
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Logging In...' : 'Log In'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => router.replace('/sign-up')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Create an Account
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600' },
  container: { borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, marginBottom: 22 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#dc2626', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 22,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 12, borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.7 },
});