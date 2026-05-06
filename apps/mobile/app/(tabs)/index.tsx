import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  PanResponder,
  Animated,
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
  reply_count?: number;
};

type Reply = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
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

// ─── Reply Thread Modal ───────────────────────────────────────────────────────

function ReplyModal({
  post,
  visible,
  onClose,
  currentUserId,
  colors,
  isDarkMode,
  bottomInset,
}: {
  post: PostItem | null;
  visible: boolean;
  onClose: () => void;
  currentUserId: string | null;
  colors: any;
  isDarkMode: boolean;
  bottomInset: number;
}) {
  const { top: topInset } = useSafeAreaInsets();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          // Swipe far enough — dismiss
          Animated.timing(translateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible && post) {
      loadReplies();
    } else {
      setReplies([]);
      setReplyText('');
    }
  }, [visible, post?.id]);

  async function loadReplies() {
    if (!post) return;
    setLoadingReplies(true);
    const { data, error } = await supabase
      .from('post_replies')
      .select(`
        id,
        body,
        created_at,
        author_id,
        profiles:author_id (
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.log('ERROR LOADING REPLIES:', error);
    } else {
      setReplies((data as Reply[]) || []);
    }
    setLoadingReplies(false);
  }

  async function submitReply() {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please log in to reply.');
      return;
    }
    const body = replyText.trim();
    if (!body) return;
    if (!post) return;

    setSubmitting(true);
    const { error } = await supabase.from('post_replies').insert({
      post_id: post.id,
      author_id: currentUserId,
      body,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Could not post your reply.');
      return;
    }

    setReplyText('');
    await loadReplies();
  }

  if (!post) return null;

  const postAuthorName = post.profiles?.full_name || 'Unknown';
  const postAvatar = post.profiles?.avatar_url;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalContainer, { backgroundColor: colors.bg, transform: [{ translateY }] }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'height' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Swipe handle */}
          <View style={styles.swipeHandleArea} {...panResponder.panHandlers}>
            <View style={[styles.swipeHandle, { backgroundColor: colors.muted }]} />
          </View>

          {/* Modal Header — pinned below safe area, never moves */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: topInset }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thread</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.closeButtonText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Original Post */}
          <View style={[styles.originalPost, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
              <View style={styles.left}>
                {postAvatar ? (
                  <Image source={{ uri: postAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{getInitials(postAuthorName)}</Text>
                  </View>
                )}
                <Pressable onPress={() => { onClose(); router.push({ pathname: '/profile/[userId]', params: { userId: post.author_id } }); }}>
                  <Text style={[styles.name, { color: colors.text }]}>{postAuthorName}</Text>
                </Pressable>
              </View>
              <Text style={[styles.time, { color: colors.muted }]}>
                {formatPostTimestamp(post.created_at)}
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>
          </View>

          {/* Replies divider */}
          <Text style={[styles.repliesLabel, { color: colors.muted }]}>
            {replies.length === 0 ? 'No replies yet' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
          </Text>

          {/* Replies list */}
          {loadingReplies ? (
            <ActivityIndicator color="#dc2626" style={{ marginTop: 16 }} />
          ) : (
            replies.map((reply) => {
              const rName = reply.profiles?.full_name || 'Unknown';
              const rAvatar = reply.profiles?.avatar_url;
              return (
                <View
                  key={reply.id}
                  style={[styles.replyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.topRow}>
                    <View style={styles.left}>
                      {rAvatar ? (
                        <Image source={{ uri: rAvatar }} style={styles.replyAvatar} />
                      ) : (
                        <View style={styles.replyAvatarFallback}>
                          <Text style={styles.replyAvatarText}>{getInitials(rName)}</Text>
                        </View>
                      )}
                      <Text style={[styles.name, { color: colors.text }]}>{rName}</Text>
                    </View>
                    <Text style={[styles.time, { color: colors.muted }]}>
                      {formatPostTimestamp(reply.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.body, { color: colors.text }]}>{reply.body}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Reply Input */}
        {currentUserId ? (
          <View style={[styles.replyInputRow, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(bottomInset, 12) }]}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write a reply…"
              placeholderTextColor={colors.muted}
              multiline
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              style={[styles.replyInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              maxLength={500}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendButton, (!replyText.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={submitReply}
              disabled={!replyText.trim() || submitting}
            >
              <Text style={styles.sendButtonText}>{submitting ? '…' : '↑'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.replyInputRow, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(bottomInset, 12) }]}>
            <Text style={[styles.signInPrompt, { color: colors.muted }]}>
              <Text
                style={{ color: '#dc2626', textDecorationLine: 'underline' }}
                onPress={() => { onClose(); router.push('/login'); }}
              >
                Sign in
              </Text>
              {' '}to reply
            </Text>
          </View>
        )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Feed Screen ─────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  const [selectedFeed, setSelectedFeed] = useState<FeedType>('campus');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Reply modal state
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);

  async function fetchReplyCounts(postIds: string[]): Promise<Record<string, number>> {
    if (postIds.length === 0) return {};
    const { data, error } = await supabase
      .from('post_replies')
      .select('post_id')
      .in('post_id', postIds);

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data as { post_id: string }[]) {
      counts[row.post_id] = (counts[row.post_id] || 0) + 1;
    }
    return counts;
  }

  async function fetchCampusPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, body, created_at, author_id, group_id, major,
        profiles:author_id ( full_name, avatar_url )
      `)
      .is('group_id', null)
      .is('major', null)
      .order('created_at', { ascending: false });

    if (error) { console.log('ERROR LOADING CAMPUS POSTS:', error); return; }

    const fetched = (data as PostItem[]) || [];
    const counts = await fetchReplyCounts(fetched.map(p => p.id));
    setPosts(fetched.map(p => ({ ...p, reply_count: counts[p.id] || 0 })));
  }

  async function fetchMajorPosts(majorCode: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, body, created_at, author_id, group_id, major,
        profiles:author_id ( full_name, avatar_url )
      `)
      .eq('major', majorCode)
      .order('created_at', { ascending: false });

    if (error) { console.log('ERROR LOADING MAJOR POSTS:', error); return; }

    const fetched = (data as PostItem[]) || [];
    const counts = await fetchReplyCounts(fetched.map(p => p.id));
    setPosts(fetched.map(p => ({ ...p, reply_count: counts[p.id] || 0 })));
  }

  async function loadFeedData() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) console.log('ERROR GETTING USER:', userError);

    if (!user) {
      setIsLoggedIn(false);
      setCurrentUserId(null);
      setProfile(null);
      await fetchCampusPosts();
      return;
    }

    setIsLoggedIn(true);
    setCurrentUserId(user.id);

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

  useEffect(() => { loadFeedData(); }, []);

  useFocusEffect(
    useCallback(() => { loadFeedData(); }, [selectedFeed])
  );

  async function handleComposePress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Not signed in', 'Please log in before creating a post.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/login') },
      ]);
      return;
    }
    router.push('/compose');
  }

  async function handleMajorFeedPress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in required', 'Sign into your account to see your major feed.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/login') },
      ]);
      return;
    }

    const { data: freshProfile, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, major')
      .eq('user_id', user.id)
      .single();

    if (error) { Alert.alert('Error', 'Could not load your latest profile.'); return; }

    const typedFreshProfile = freshProfile as UserProfile;
    setProfile(typedFreshProfile);

    if (!typedFreshProfile?.major) {
      Alert.alert('No major selected', 'Pick a major in your account page to see your major feed.');
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
    if (selectedFeed === 'campus') { fetchCampusPosts(); return; }
    if (selectedFeed === 'major' && profile?.major) { fetchMajorPosts(profile.major); return; }
    if (selectedFeed === 'major' && !profile?.major) { setPosts([]); }
  }, [selectedFeed, profile?.major]);

  function openReplyModal(post: PostItem) {
    setSelectedPost(post);
    setReplyModalVisible(true);
  }

  function closeReplyModal() {
    setReplyModalVisible(false);
    // Refresh feed so reply counts update
    loadFeedData();
  }

  const feedTitle = useMemo(() => {
    if (selectedFeed === 'campus') return 'Campus Feed';
    if (profile?.major) return `${profile.major} Feed`;
    return 'Major Feed';
  }, [selectedFeed, profile?.major]);

  const showNoMajorNotice = selectedFeed === 'major' && isLoggedIn && !profile?.major;
  const showNoPostsNotice = selectedFeed === 'major' && isLoggedIn && !!profile?.major && posts.length === 0;
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
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight, backgroundColor: colors.bg }]}
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
                <Text style={[styles.feedToggleText, { color: selectedFeed === 'campus' ? '#ffffff' : colors.text }]}>
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
                <Text style={[styles.feedToggleText, { color: selectedFeed === 'major' ? '#ffffff' : colors.text }]}>
                  My Major
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.feedLabel, { color: colors.text }]}>{feedTitle}</Text>

            {showNoMajorNotice ? (
              <View style={[styles.noticeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.noticeTitle, { color: colors.text }]}>No major feed available</Text>
                <Text style={[styles.noticeText, { color: colors.muted }]}>
                  Pick a major in your account page to see your major feed.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          selectedFeed === 'campus' ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Campus posts will show up here.</Text>
            </View>
          ) : showNoPostsNotice ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
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
          const replyCount = item.reply_count || 0;

          const goToProfile = () => router.push({ pathname: '/profile/[userId]', params: { userId: item.author_id } });

          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.topRow}>
                <View style={styles.left}>
                  <Pressable style={styles.authorRow} onPress={goToProfile}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>{getInitials(name)}</Text>
                      </View>
                    )}
                    <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.time, { color: colors.muted }]}>{time}</Text>
              </View>

              <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>

              {/* Reply bar */}
              <View style={[styles.replyBar, { borderTopColor: colors.border }]}>
                <Pressable style={styles.replyButton} onPress={() => openReplyModal(item)}>
                  <Text style={styles.replyButtonText}>💬 Reply</Text>
                </Pressable>

                {replyCount > 0 && (
                  <Pressable onPress={() => openReplyModal(item)}>
                    <Text style={[styles.replyCount, { color: colors.muted }]}>
                      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />

      <ReplyModal
        post={selectedPost}
        visible={replyModalVisible}
        onClose={closeReplyModal}
        currentUserId={currentUserId}
        colors={colors}
        isDarkMode={isDarkMode}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  feedToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  feedToggleButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  activeFeedToggleButton: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  feedToggleText: { fontWeight: '600' },
  feedLabel: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  noticeBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  noticeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  noticeText: { fontSize: 14, lineHeight: 20 },
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontWeight: '600', flexShrink: 1 },
  time: { fontSize: 12 },
  body: { marginTop: 6 },

  // Reply bar on each card
  replyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  replyButton: { flexDirection: 'row', alignItems: 'center' },
  replyButtonText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  replyCount: { fontSize: 13 },

  // Modal styles
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  swipeHandleArea: { alignItems: 'center', paddingVertical: 10 },
  swipeHandle: { width: 40, height: 4, borderRadius: 2, opacity: 0.4 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 18 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 24 },

  originalPost: { borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1 },
  repliesLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 4 },

  replyCard: { borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1 },
  replyAvatar: { width: 34, height: 34, borderRadius: 17 },
  replyAvatarFallback: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  replyAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Reply input at bottom of modal
  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  replyInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 42, maxHeight: 120 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  signInPrompt: { fontSize: 14, flex: 1, textAlign: 'center', paddingVertical: 8 },
});