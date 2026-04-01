import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import MobileHeader, { HEADER_BASE_HEIGHT } from '../../src/components/MobileHeader';

type ClubItem = {
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type ClubMemberRow = {
  user_id: string;
  club_code: string;
};

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [joinedClubs, setJoinedClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingClubCode, setProcessingClubCode] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    await Promise.all([fetchClubs(), loadCurrentUserMemberships()]);
    setLoading(false);
  }

  async function fetchClubs() {
    const { data, error } = await supabase
      .from('clubs')
      .select('code, name, description, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.log('ERROR LOADING CLUBS:', error);
      return;
    }

    setClubs((data as ClubItem[]) || []);
  }

  async function loadCurrentUserMemberships() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.log('ERROR GETTING USER:', userError);
      return;
    }

    if (!user) {
      setUserId(null);
      setJoinedClubs([]);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('club_members')
      .select('user_id, club_code')
      .eq('user_id', user.id);

    if (error) {
      console.log('ERROR LOADING CLUB MEMBERSHIPS:', error);
      return;
    }

    const memberships = (data as ClubMemberRow[]) || [];
    setJoinedClubs(memberships.map((row) => row.club_code));
  }

  function isJoined(code: string) {
    return joinedClubs.includes(code);
  }

  async function handleClubPress(club: ClubItem) {
    if (!userId) {
      Alert.alert(
        'Sign in required',
        'You need to sign in before joining or leaving clubs.'
      );
      return;
    }

    if (isJoined(club.code)) {
      Alert.alert(
        'Leave club?',
        `Do you want to leave ${club.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => leaveClub(club.code),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Join club?',
      `Do you want to join ${club.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => joinClub(club.code),
        },
      ]
    );
  }

  async function joinClub(code: string) {
  if (!userId) return;

  try {
    setProcessingClubCode(code);

    const { error } = await supabase
      .from('club_members')
      .upsert(
        {
          user_id: userId,
          club_code: code,
          role: 'member',
        },
        {
          onConflict: 'club_code,user_id',
        }
      );

    if (error) {
      console.log('ERROR JOINING CLUB:', error);
      Alert.alert('Error', `Could not join this club: ${error.message}`);
      return;
    }

    setJoinedClubs((current) =>
      current.includes(code) ? current : [...current, code]
    );
  } finally {
    setProcessingClubCode(null);
  }
}

async function leaveClub(code: string) {
  if (!userId) return;

  try {
    setProcessingClubCode(code);

    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_code', code)
      .eq('user_id', userId);

    if (error) {
      console.log('ERROR LEAVING CLUB:', error);
      Alert.alert('Error', `Could not leave this club: ${error.message}`);
      return;
    }

    setJoinedClubs((current) =>
      current.filter((clubCode) => clubCode !== code)
    );
  } finally {
    setProcessingClubCode(null);
  }
}

  const sortedClubs = useMemo(() => {
    const joined = clubs
      .filter((club) => joinedClubs.includes(club.code))
      .sort((a, b) => a.name.localeCompare(b.name));

    const notJoined = clubs
      .filter((club) => !joinedClubs.includes(club.code))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...joined, ...notJoined];
  }, [clubs, joinedClubs]);

  const headerSubtitle = useMemo(() => {
    if (!userId) {
      return 'Sign in to join or leave clubs';
    }

    return 'Tap a club to join or leave it';
  }, [userId]);

  const headerHeight = HEADER_BASE_HEIGHT + insets.top;

  function renderClubItem({ item }: { item: ClubItem }) {
    const joined = isJoined(item.code);
    const processing = processingClubCode === item.code;

    return (
      <Pressable
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          joined && styles.joinedCard,
        ]}
        onPress={() => handleClubPress(item)}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.code}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.clubName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.clubDesc, { color: colors.muted }]}>
            {item.description || 'No description yet.'}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            joined ? styles.joinedPill : styles.notJoinedPill,
          ]}
        >
          {processing ? (
            <ActivityIndicator
              size="small"
              color={joined ? '#065f46' : '#991b1b'}
            />
          ) : (
            <Text
              style={[
                styles.statusPillText,
                joined ? styles.joinedPillText : styles.notJoinedPillText,
              ]}
            >
              {joined ? 'Joined' : 'Join'}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <MobileHeader />

      <FlatList
        data={sortedClubs}
        renderItem={renderClubItem}
        keyExtractor={(item) => item.code}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight, backgroundColor: colors.bg },
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Clubs</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {headerSubtitle}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No clubs found
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Clubs will appear here once available.
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={loadPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  headerBlock: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedCard: {
    borderColor: '#86efac',
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    paddingRight: 10,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clubDesc: {
    fontSize: 14,
  },
  statusPill: {
    minWidth: 70,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedPill: {
    backgroundColor: '#dcfce7',
  },
  notJoinedPill: {
    backgroundColor: '#fee2e2',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  joinedPillText: {
    color: '#065f46',
  },
  notJoinedPillText: {
    color: '#991b1b',
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
  },
});