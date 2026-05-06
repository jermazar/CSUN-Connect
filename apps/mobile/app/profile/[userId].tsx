import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, Pressable, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';

type ProfileData = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  major: string | null;
  graduation_year: number | null;
  avatar_url: string | null;
  role: string | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [clubs, setClubs] = useState<string[]>([]);
  const [majorName, setMajorName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) loadProfile(userId);
  }, [userId]);

  async function loadProfile(uid: string) {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, first_name, last_name, major, graduation_year, avatar_url, role')
      .eq('user_id', uid)
      .maybeSingle();

    if (error || !data) { setNotFound(true); setLoading(false); return; }

    const prof = data as ProfileData;
    setProfile(prof);

    if (prof.major) {
      const { data: majorData } = await supabase
        .from('majors').select('name').eq('code', prof.major).maybeSingle();
      setMajorName(majorData?.name ?? prof.major);
    }

    const { data: clubData } = await supabase
      .from('club_members').select('club_code').eq('user_id', uid);
    setClubs(((clubData || []) as any[]).map(r => r.club_code));

    setLoading(false);
  }

  function handleMessagePress() {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please log in to send messages.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (currentUserId === userId) {
      Alert.alert("That's you!", "You can't message yourself.");
      return;
    }

    // Just navigate — the conversation is created only when the first message is sent
    router.push({
      pathname: '/conversation/[id]',
      params: {
        id: 'new',
        otherUserId: userId,
        otherName: profile?.full_name || 'Student',
      },
    });
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#dc2626" /></View>
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>Profile not found.</Text>
        </View>
      </View>
    );
  }

  const displayName = profile.full_name?.trim() || 'CSUN Student';
  const isOwnProfile = currentUserId === userId;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{getInitials(displayName)}</Text>
            </View>
          )}
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          {profile.role && profile.role !== 'student' && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{profile.role.toUpperCase()}</Text>
            </View>
          )}

          {/* Message button — only show if viewing someone else's profile */}
          {!isOwnProfile && (
            <Pressable
              style={styles.messageBtn}
              onPress={handleMessagePress}
            >
              <Text style={styles.messageBtnText}>✉ Send Message</Text>
            </Pressable>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow label="Major" value={majorName || 'Not set'} colors={colors} />
          <Divider colors={colors} />
          <InfoRow
            label="Graduation Year"
            value={profile.graduation_year ? String(profile.graduation_year) : 'Not set'}
            colors={colors}
          />
        </View>

        {/* Clubs */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>CLUBS</Text>
          {clubs.length > 0 ? (
            <View style={styles.chipsRow}>
              {clubs.map(code => (
                <View key={code} style={styles.chip}>
                  <Text style={styles.chipText}>{code}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.muted }]}>Not a member of any clubs yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
  topBarTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 14 },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarFallbackText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  displayName: { fontSize: 24, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  roleBadge: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  roleBadgeText: { color: '#991b1b', fontSize: 12, fontWeight: '700' },
  messageBtn: {
    backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 12,
    paddingHorizontal: 28, marginTop: 16, minWidth: 160, alignItems: 'center',
  },
  messageBtnDisabled: { opacity: 0.6 },
  messageBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  infoCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fee2e2', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { color: '#991b1b', fontSize: 13, fontWeight: '700' },
  emptyText: { fontSize: 14 },
});