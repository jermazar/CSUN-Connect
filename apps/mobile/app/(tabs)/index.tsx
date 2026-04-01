import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import MobileHeader, { HEADER_BASE_HEIGHT } from '../../src/components/MobileHeader';

type FeedType = 'campus' | 'major';

type PostItem = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  group_id: string | null;
  major: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type UserProfile = {
  user_id: string;
  full_name: string | null;
  major: string | null;
};

function formatPostTimestamp(dateString: string) {
  const postDate = new Date(dateString);
  const now = new Date();

  const sameDay =
    postDate.getFullYear() === now.getFullYear() &&
    postDate.getMonth() === now.getMonth() &&
    postDate.getDate() === now.getDate();

  if (sameDay) {
    return postDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const month = String(postDate.getMonth() + 1).padStart(2, '0');
  const day = String(postDate.getDate()).padStart(2, '0');
  const year = String(postDate.getFullYear()).slice(-2);

  const time = postDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${month}/${day}/${year} ${time}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [selectedFeed, setSelectedFeed] = useState<FeedType>('campus');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchCampusPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        body,
        created_at,
        author_id,
        group_id,
        major,
        profiles:author_id (
          full_name,
          avatar_url
        )
      `)
      .is('group_id', null)
      .is('major', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('ERROR LOADING CAMPUS POSTS:', error);
      return;
    }

    setPosts((data as PostItem[]) || []);
  }

  async function fetchMajorPosts(majorCode: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        body,
        created_at,
        author_id,
        group_id,
        major,
        profiles:author_id (
          full_name,
          avatar_url
        )
      `)
      .eq('major', majorCode)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('ERROR LOADING MAJOR POSTS:', error);
      return;
    }

    setPosts((data as PostItem[]) || []);
  }

  async function loadFeedData() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log('ERROR GETTING USER:', userError);
    }

    if (!user) {
      setIsLoggedIn(false);
      setProfile(null);
      await fetchCampusPosts();
      return;
    }

    setIsLoggedIn(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, major')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('ERROR LOADING PROFILE:', profileError);
      await fetchCampusPosts();
      return;
    }

    const freshProfile = profileData as UserProfile;
    setProfile(freshProfile);

    if (selectedFeed === 'major') {
      if (freshProfile?.major) {
        await fetchMajorPosts(freshProfile.major);
      } else {
        setPosts([]);
      }
    } else {
      await fetchCampusPosts();
    }
  }

  useEffect(() => {
    loadFeedData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeedData();
    }, [selectedFeed])
  );

  async function handleComposePress() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        'Not signed in',
        'You are not signed into any account currently. Please log in before creating a post.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log In',
            onPress: () => router.push('/login'),
          },
        ]
      );
      return;
    }

    router.push('/compose');
  }

  async function handleMajorFeedPress() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        'Sign in required',
        'Sign into your account to see your major feed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log In',
            onPress: () => router.push('/login'),
          },
        ]
      );
      return;
    }

    const { data: freshProfile, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, major')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.log('ERROR LOADING FRESH PROFILE:', error);
      Alert.alert('Error', 'Could not load your latest profile.');
      return;
    }

    const typedFreshProfile = freshProfile as UserProfile;
    setProfile(typedFreshProfile);

    if (!typedFreshProfile?.major) {
      Alert.alert(
        'No major selected',
        'Pick a major in your account page to see your major feed.'
      );
      return;
    }

    setSelectedFeed('major');
    await fetchMajorPosts(typedFreshProfile.major);
  }

  async function refreshFeed() {
    setRefreshing(true);
    await loadFeedData();
    setRefreshing(false);
  }

  useEffect(() => {
    if (selectedFeed === 'campus') {
      fetchCampusPosts();
      return;
    }

    if (selectedFeed === 'major' && profile?.major) {
      fetchMajorPosts(profile.major);
      return;
    }

    if (selectedFeed === 'major' && !profile?.major) {
      setPosts([]);
    }
  }, [selectedFeed, profile?.major]);

  const feedTitle = useMemo(() => {
    if (selectedFeed === 'campus') return 'Campus Feed';
    if (profile?.major) return `${profile.major} Feed`;
    return 'Major Feed';
  }, [selectedFeed, profile?.major]);

  const showNoMajorNotice =
    selectedFeed === 'major' &&
    isLoggedIn &&
    !profile?.major;

  const showNoPostsNotice =
    selectedFeed === 'major' &&
    isLoggedIn &&
    !!profile?.major &&
    posts.length === 0;

  const headerHeight = HEADER_BASE_HEIGHT + insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <MobileHeader
        showComposeButton
        composeDisabled={!isLoggedIn}
        onComposePress={handleComposePress}
      />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight, backgroundColor: colors.bg },
        ]}
        refreshing={refreshing}
        onRefresh={refreshFeed}
        ListHeaderComponent={
          <View>
            <View style={styles.feedToggleRow}>
              <Pressable
                style={[
                  styles.feedToggleButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedFeed === 'campus' && styles.activeFeedToggleButton,
                ]}
                onPress={() => setSelectedFeed('campus')}
              >
                <Text
                  style={[
                    styles.feedToggleText,
                    { color: selectedFeed === 'campus' ? '#ffffff' : colors.text },
                  ]}
                >
                  Campus Feed
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.feedToggleButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedFeed === 'major' && styles.activeFeedToggleButton,
                ]}
                onPress={handleMajorFeedPress}
              >
                <Text
                  style={[
                    styles.feedToggleText,
                    { color: selectedFeed === 'major' ? '#ffffff' : colors.text },
                  ]}
                >
                  My Major
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.feedLabel, { color: colors.text }]}>
              {feedTitle}
            </Text>

            {showNoMajorNotice ? (
              <View
                style={[
                  styles.noticeBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.noticeTitle, { color: colors.text }]}>
                  No major feed available
                </Text>
                <Text style={[styles.noticeText, { color: colors.muted }]}>
                  Pick a major in your account page to see your major feed.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          selectedFeed === 'campus' ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No posts yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Campus posts will show up here.
              </Text>
            </View>
          ) : showNoPostsNotice ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No posts yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Major-specific posts will show up here once students in your major start posting.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const name = item.profiles?.full_name || 'Unknown';
          const avatar = item.profiles?.avatar_url;
          const time = formatPostTimestamp(item.created_at);

          return (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.topRow}>
                <View style={styles.left}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {getInitials(name)}
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                </View>

                <Text style={[styles.time, { color: colors.muted }]}>{time}</Text>
              </View>

              <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  feedToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  feedToggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeFeedToggleButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  feedToggleText: {
    fontWeight: '600',
  },
  feedLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  name: {
    fontWeight: '600',
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
  },
  body: {
    marginTop: 6,
  },
});