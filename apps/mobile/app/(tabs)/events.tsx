import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import MobileHeader, { HEADER_BASE_HEIGHT } from '../../src/components/MobileHeader';

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  location: string | null;
};

type OfficerRow = {
  club_code: string;
};

const DESCRIPTION_PREVIEW_LENGTH = 120;

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [officerClubCodes, setOfficerClubCodes] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'previous'>('upcoming');
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);

  useEffect(() => {
    checkPermissions();
    fetchEvents();
  }, []);

  async function checkPermissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setOfficerClubCodes([]);
      return;
    }

    setIsLoggedIn(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setIsAdmin(profile?.role === 'admin');

    const { data: officerData } = await supabase
      .from('club_officers')
      .select('club_code')
      .eq('user_id', user.id);

    const typedOfficerData = (officerData as OfficerRow[]) || [];
    setOfficerClubCodes(typedOfficerData.map((row) => row.club_code));
  }

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, start_time, location')
      .order('start_time', { ascending: true });

    if (error) {
      console.log('ERROR LOADING EVENTS:', error);
      return;
    }

    setEvents((data as EventItem[]) || []);
  }

  function handleCompose() {
    router.push({
      pathname: '/event-compose',
      params: {
        isAdmin: String(isAdmin),
        officerClubCodes: JSON.stringify(officerClubCodes),
      },
    });
  }

  function toggleExpanded(eventId: string) {
    setExpandedEvents((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    );
  }

  function getPreviewText(description: string) {
    if (description.length <= DESCRIPTION_PREVIEW_LENGTH) {
      return description;
    }

    return `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}...`;
  }

  const canPost = isLoggedIn && (isAdmin || officerClubCodes.length > 0);

  const now = new Date();

  const upcomingEvents = useMemo(() => {
    return events.filter((event) => new Date(event.start_time) >= now);
  }, [events]);

  const previousEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.start_time) < now)
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
  }, [events]);

  const displayedEvents =
    selectedTab === 'upcoming' ? upcomingEvents : previousEvents;

  function formatEventDate(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatEventTime(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const headerHeight = HEADER_BASE_HEIGHT + insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <MobileHeader
        showComposeButton={canPost}
        onComposePress={handleCompose}
      />

      <FlatList
        data={displayedEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight, backgroundColor: colors.bg },
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.tabsRow}>
              <Pressable
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedTab === 'upcoming' && styles.activeTabButton,
                ]}
                onPress={() => setSelectedTab('upcoming')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: selectedTab === 'upcoming' ? '#ffffff' : colors.text },
                  ]}
                >
                  Upcoming Events
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedTab === 'previous' && styles.activeTabButton,
                ]}
                onPress={() => setSelectedTab('previous')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: selectedTab === 'previous' ? '#ffffff' : colors.text },
                  ]}
                >
                  Previous Events
                </Text>
              </Pressable>
            </View>
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
              {selectedTab === 'upcoming'
                ? 'No upcoming events'
                : 'No previous events'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {selectedTab === 'upcoming'
                ? 'When events are scheduled, they will show up here.'
                : 'Past events will show up here once they have happened.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const description = item.description?.trim() || '';
          const isExpanded = expandedEvents.includes(item.id);
          const isLongDescription =
            description.length > DESCRIPTION_PREVIEW_LENGTH;

          return (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>
                  {formatEventDate(item.start_time)}
                </Text>
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {item.title}
                </Text>

                <Text style={[styles.time, { color: colors.muted }]}>
                  {formatEventTime(item.start_time)}
                </Text>

                {item.location ? (
                  <Text style={[styles.location, { color: colors.muted }]}>
                    {item.location}
                  </Text>
                ) : null}

                {description ? (
                  <>
                    <Text style={[styles.description, { color: colors.text }]}>
                      {isExpanded ? description : getPreviewText(description)}
                    </Text>

                    {isLongDescription ? (
                      <View style={styles.showMoreRow}>
                        <Pressable onPress={() => toggleExpanded(item.id)}>
                          <Text style={styles.showMoreText}>
                            {isExpanded ? 'Show less' : 'Show more'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
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
    padding: 12,
    paddingBottom: 24,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateBadge: {
    minWidth: 88,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateBadgeText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  showMoreRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
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
});