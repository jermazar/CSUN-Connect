import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  Image, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import MobileHeader, { HEADER_BASE_HEIGHT } from '../../src/components/MobileHeader';

type ConversationItem = {
  id: string;
  created_at: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const headerHeight = HEADER_BASE_HEIGHT + insets.top;

  async function loadConversations() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);

    // Get all conversations this user is part of
    const { data: participantRows, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (error || !participantRows?.length) { setConversations([]); setLoading(false); return; }

    const convIds = participantRows.map((r: any) => r.conversation_id);

    // For each conversation, get the other participant's profile
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles:user_id(full_name, avatar_url)')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    // Get last message per conversation
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMsgMap: Record<string, { body: string; created_at: string }> = {};
    for (const msg of (lastMessages || []) as any[]) {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = { body: msg.body, created_at: msg.created_at };
      }
    }

    const items: ConversationItem[] = (allParticipants || []).map((p: any) => {
      const prof = p.profiles;
      const last = lastMsgMap[p.conversation_id];
      return {
        id: p.conversation_id,
        created_at: last?.created_at || '',
        other_user_id: p.user_id,
        other_user_name: prof?.full_name || 'CSUN Student',
        other_user_avatar: prof?.avatar_url || null,
        last_message: last?.body || null,
        last_message_at: last?.created_at || null,
      };
    });

    // Sort by most recent message
    items.sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    setConversations(items);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { loadConversations(); }, []));

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <MobileHeader />
      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingTop: headerHeight }]}
        refreshing={loading}
        onRefresh={loadConversations}
        ListHeaderComponent={
          <Text style={[styles.pageTitle, { color: colors.text }]}>Messages</Text>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {isLoggedIn
                  ? 'Tap a student\'s name on the feed to visit their profile and start a conversation.'
                  : 'Sign in to send and receive messages.'}
              </Text>
              {!isLoggedIn && (
                <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
                  <Text style={styles.signInBtnText}>Log In</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id, otherName: item.other_user_name } })}
          >
            {item.other_user_avatar ? (
              <Image source={{ uri: item.other_user_avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{getInitials(item.other_user_name)}</Text>
              </View>
            )}
            <View style={styles.rowContent}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowName, { color: colors.text }]}>{item.other_user_name}</Text>
                {item.last_message_at && (
                  <Text style={[styles.rowTime, { color: colors.muted }]}>{timeAgo(item.last_message_at)}</Text>
                )}
              </View>
              <Text style={[styles.rowPreview, { color: colors.muted }]} numberOfLines={1}>
                {item.last_message || 'No messages yet'}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  empty: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  signInBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowName: { fontWeight: '700', fontSize: 15 },
  rowTime: { fontSize: 12 },
  rowPreview: { fontSize: 14 },
});