import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';

type Message = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ConversationScreen() {
  // id = existing conversation UUID, or 'new' for a fresh one
  // otherUserId = only present when id === 'new'
  const { id, otherUserId, otherName } = useLocalSearchParams<{
    id: string;
    otherUserId?: string;
    otherName?: string;
  }>();

  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(id !== 'new'); // no loading needed for brand new
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // The real conversation ID — starts null for new conversations
  const [conversationId, setConversationId] = useState<string | null>(
    id !== 'new' ? id : null
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    })();

    // Only load messages if we have a real conversation
    if (id !== 'new') {
      loadMessages(id);
      const channel = supabase
        .channel(`conversation:${id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        }, () => { loadMessages(id); })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  async function loadMessages(convId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`id, body, created_at, sender_id, profiles:sender_id(full_name, avatar_url)`)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (!error) setMessages((data as Message[]) || []);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  // Creates the conversation in DB and returns its ID
  async function getOrCreateConversationId(myUserId: string): Promise<string | null> {
    // If we already have one, return it
    if (conversationId) return conversationId;

    const targetUserId = otherUserId;
    if (!targetUserId) return null;

    // Check if a conversation already exists between these two
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', myUserId);

    const myConvIds = (myConvs || []).map((r: any) => r.conversation_id);

    if (myConvIds.length > 0) {
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds);

      if (shared && shared.length > 0) {
        const existing = (shared[0] as any).conversation_id;
        setConversationId(existing);
        return existing;
      }
    }

    // Create a brand new conversation
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convErr || !newConv) return null;
    const convId = (newConv as any).id;

    // Add both participants
    const { error: myErr } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: convId, user_id: myUserId });

    if (myErr) {
      await supabase.from('conversations').delete().eq('id', convId);
      return null;
    }

    const { error: theirErr } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: convId, user_id: targetUserId });

    if (theirErr) {
      await supabase.from('conversations').delete().eq('id', convId);
      return null;
    }

    setConversationId(convId);
    return convId;
  }

  async function sendMessage() {
    const body = text.trim();
    if (!body || !currentUserId || sending) return;

    setSending(true);
    setText('');

    // Create conversation on first send if needed
    const convId = await getOrCreateConversationId(currentUserId);
    if (!convId) {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
      setText(body);
      setSending(false);
      return;
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: currentUserId,
      body,
    });

    if (error) {
      Alert.alert('Error', 'Could not send message.');
      setText(body);
    } else {
      await loadMessages(convId);
    }

    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
          {otherName || 'Conversation'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.flex}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#dc2626" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={[styles.emptyChatText, { color: colors.muted }]}>
                  No messages yet. Say hello! 👋
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === currentUserId;
              const name = item.profiles?.full_name || 'Student';
              const avatar = item.profiles?.avatar_url;
              return (
                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                  {!isMe && (
                    avatar
                      ? <Image source={{ uri: avatar }} style={styles.msgAvatar} />
                      : <View style={styles.msgAvatarFallback}>
                          <Text style={styles.msgAvatarText}>{getInitials(name)}</Text>
                        </View>
                  )}
                  <View style={[
                    styles.bubble,
                    isMe
                      ? styles.bubbleMe
                      : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }]
                  ]}>
                    {!isMe && <Text style={[styles.bubbleName, { color: colors.muted }]}>{name}</Text>}
                    <Text style={[styles.bubbleText, { color: isMe ? '#fff' : colors.text }]}>{item.body}</Text>
                    <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.muted }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={colors.muted}
            multiline
            keyboardAppearance={isDarkMode ? 'dark' : 'light'}
            style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendBtnText}>↑</Text>
            }
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  headerName: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  messageList: { padding: 16, paddingBottom: 8 },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyChatText: { fontSize: 15 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15 },
  msgAvatarFallback: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  msgAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: '#dc2626', borderBottomRightRadius: 4 },
  bubbleThem: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleName: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});