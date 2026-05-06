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

const CSUN_DOMAIN = '@my.csun.edu';

function isCsunEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(CSUN_DOMAIN);
}

export default function SignUpScreen() {
  const { colors, isDarkMode } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showDomainHint = email.length > 0 && !isCsunEmail(email);

  async function handleSignUp() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please fill out all fields.');
      return;
    }

    if (!isCsunEmail(email)) {
      Alert.alert('CSUN email required', `You must sign up with your CSUN student email ending in ${CSUN_DOMAIN}.`);
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName },
      },
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        { user_id: userId, first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName, role: 'student' },
        { onConflict: 'user_id' }
      );
      if (profileError) console.log('PROFILE UPSERT ERROR:', profileError);
    }

    setLoading(false);
    Alert.alert('Account created', 'Your CSUN Connect account was created. Please log in.');
    router.replace('/login');
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
            <Text style={[styles.title, { color: colors.text }]}>Sign Up</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Create your CSUN Connect account
            </Text>

            {/* CSUN-only notice */}
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>
                🎓 CSUN students only — use your{' '}
                <Text style={styles.noticeEmphasis}>@my.csun.edu</Text> email
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
            />

            <Text style={[styles.label, { color: colors.text }]}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
            />

            <Text style={[styles.label, { color: colors.text }]}>CSUN Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="yourname@my.csun.edu"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[
                styles.input,
                { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText },
                showDomainHint && styles.inputError,
              ]}
            />
            {showDomainHint && (
              <Text style={styles.errorHint}>Must end in @my.csun.edu</Text>
            )}

            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
            />

            <Pressable
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => router.replace('/login')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Back to Log In
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
  subtitle: { fontSize: 15, marginBottom: 16 },
  noticeBanner: {
    backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fbbf24',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10,
  },
  noticeText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  noticeEmphasis: { fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 16,
  },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fff5f5' },
  errorHint: { fontSize: 12, color: '#dc2626', marginTop: 4, marginLeft: 4 },
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