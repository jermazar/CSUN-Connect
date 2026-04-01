import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../src/theme/ThemeContext';

type FeedType = 'campus' | 'major';

type UserProfile = {
  user_id: string;
  full_name: string | null;
  major: string | null;
};

export default function ComposeScreen() {
  const { colors, isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [selectedFeed, setSelectedFeed] = useState<FeedType>('campus');
  const [body, setBody] = useState('');

  useEffect(() => {
    loadComposeData();
  }, []);

  async function loadComposeData() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log('ERROR GETTING USER:', userError);
      setLoading(false);
      return;
    }

    if (!user) {
      Alert.alert('Not logged in', 'Please log in before creating a post.');
      router.replace('/login');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, major')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('ERROR LOADING PROFILE:', profileError);
      setLoading(false);
      return;
    }

    const freshProfile = profileData as UserProfile;
    setProfile(freshProfile);

    setLoading(false);
  }

  async function handlePost() {
    if (!userId) {
      Alert.alert('Not logged in', 'Please log in before posting.');
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      Alert.alert('Missing post text', 'Please write something before posting.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Not logged in', 'Please log in before posting.');
      return;
    }

    // always re-fetch latest profile right before posting
    const { data: latestProfile, error: latestProfileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, major')
      .eq('user_id', user.id)
      .single();

    if (latestProfileError) {
      console.log('ERROR LOADING LATEST PROFILE:', latestProfileError);
      Alert.alert('Error', 'Could not load your latest profile.');
      return;
    }

    const typedLatestProfile = latestProfile as UserProfile;
    setProfile(typedLatestProfile);

    if (selectedFeed === 'major' && !typedLatestProfile?.major) {
      Alert.alert(
        'No major selected',
        'Pick a major in your account page before posting to your major feed.'
      );
      return;
    }

    const postMajor =
      selectedFeed === 'major' ? typedLatestProfile.major : null;

    const payload = {
      author_id: userId,
      body: trimmedBody,
      group_id: null,
      major: postMajor,
    };

    console.log('POST PAYLOAD:', payload);

    setPosting(true);

    const { data: insertedPost, error } = await supabase
      .from('posts')
      .insert(payload)
      .select('id, body, major, group_id')
      .single();

    setPosting(false);

    if (error) {
      console.log('ERROR CREATING POST:', error);
      Alert.alert('Error', `Could not create your post: ${error.message}`);
      return;
    }

    console.log('INSERTED POST:', insertedPost);

    setBody('');
    Alert.alert(
      'Posted',
      selectedFeed === 'major'
        ? `Your message was posted to the ${typedLatestProfile.major} feed.`
        : 'Your message was posted to the campus feed.'
    );

    router.back();
  }

  const feedLabel = useMemo(() => {
    if (selectedFeed === 'campus') return 'Campus Feed';
    if (profile?.major) return `${profile.major} Feed`;
    return 'Major Feed';
  }, [selectedFeed, profile?.major]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const canPostToMajor = !!profile?.major;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: colors.bg },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Create Post</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Share something with campus or your major feed.
          </Text>

          <View style={styles.toggleRow}>
            <Pressable
              style={[
                styles.toggleButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                selectedFeed === 'campus' && styles.activeToggleButton,
              ]}
              onPress={() => setSelectedFeed('campus')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: selectedFeed === 'campus' ? '#ffffff' : colors.text },
                ]}
              >
                Campus Feed
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.toggleButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                selectedFeed === 'major' && styles.activeToggleButton,
                !canPostToMajor && styles.disabledToggleButton,
              ]}
              onPress={() => {
                if (canPostToMajor) {
                  setSelectedFeed('major');
                }
              }}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  {
                    color:
                      selectedFeed === 'major'
                        ? '#ffffff'
                        : !canPostToMajor
                        ? colors.muted
                        : colors.text,
                  },
                ]}
              >
                My Major
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.muted }]}>
              Posting to
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {feedLabel}
            </Text>

            {!canPostToMajor ? (
              <Text style={[styles.infoSubtext, { color: colors.muted }]}>
                A major feed is only available if your account has a major selected.
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.composerCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>Message</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What's happening on campus?"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.inputText,
                },
              ]}
              maxLength={500}
            />

            <Text style={[styles.characterCount, { color: colors.muted }]}>
              {body.length}/500
            </Text>

            <Pressable
              style={[styles.postButton, posting && styles.disabledPostButton]}
              onPress={handlePost}
              disabled={posting}
            >
              <Text style={styles.postButtonText}>
                {posting ? 'Posting...' : 'Post Message'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  disabledToggleButton: {
    opacity: 0.55,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  composerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 14,
  },
  postButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledPostButton: {
    opacity: 0.7,
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});