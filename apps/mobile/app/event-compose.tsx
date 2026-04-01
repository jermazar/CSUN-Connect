import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../src/theme/ThemeContext';

type ClubRow = {
  code: string;
  name: string;
};

type AudienceOption = {
  value: string;
  label: string;
};

export default function EventComposeScreen() {
  const params = useLocalSearchParams();
  const { colors, isDarkMode } = useTheme();

  const isAdmin = params.isAdmin === 'true';
  const officerClubCodes: string[] = params.officerClubCodes
    ? JSON.parse(String(params.officerClubCodes))
    : [];

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [allowedOptions, setAllowedOptions] = useState<AudienceOption[]>([]);

  const [selectedAudience, setSelectedAudience] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    loadComposeOptions();
  }, []);

  async function loadComposeOptions() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Sign in required', 'Please sign in before creating an event.');
      router.replace('/login');
      setLoading(false);
      return;
    }

    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('code, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (clubError) {
      console.log('ERROR LOADING CLUBS:', clubError);
      Alert.alert('Error', 'Could not load clubs.');
      setLoading(false);
      return;
    }

    const typedClubs = (clubData as ClubRow[]) || [];

    let options: AudienceOption[] = [];

    if (isAdmin) {
      options.push({
        value: 'campus',
        label: 'Campus Event',
      });

      options.push(
        ...typedClubs.map((club) => ({
          value: `club:${club.code}`,
          label: club.name,
        }))
      );
    } else {
      const officerOnlyClubs = typedClubs.filter((club) =>
        officerClubCodes.includes(club.code)
      );

      options = officerOnlyClubs.map((club) => ({
        value: `club:${club.code}`,
        label: club.name,
      }));
    }

    setAllowedOptions(options);

    if (options.length > 0) {
      setSelectedAudience(options[0].value);
    }

    setLoading(false);
  }

  const selectedAudienceLabel = useMemo(() => {
    return (
      allowedOptions.find((option) => option.value === selectedAudience)?.label ||
      ''
    );
  }, [allowedOptions, selectedAudience]);

  async function handleCreateEvent() {
    if (!title.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Missing info', 'Please fill in the title, date, and time.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before creating an event.');
      return;
    }

    const startDateTime = new Date(`${date}T${time}`);

    if (isNaN(startDateTime.getTime())) {
      Alert.alert(
        'Invalid date/time',
        'Please enter the date as YYYY-MM-DD and time as HH:MM in 24-hour format.'
      );
      return;
    }

    setPosting(true);

    const basePayload = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      start_time: startDateTime.toISOString(),
      created_by: user.id,
    };

    const { data: insertedEvent, error: insertError } = await supabase
      .from('events')
      .insert(basePayload)
      .select('id')
      .single();

    if (insertError) {
      console.log('ERROR CREATING EVENT:', insertError);
      setPosting(false);
      Alert.alert('Error', `Could not create event: ${insertError.message}`);
      return;
    }

    if (selectedAudience.startsWith('club:')) {
      const clubCode = selectedAudience.replace('club:', '');

      const { error: targetError } = await supabase
        .from('event_club_targets')
        .insert({
          event_id: insertedEvent.id,
          club_code: clubCode,
        });

      if (targetError) {
        console.log('ERROR LINKING CLUB EVENT:', targetError);
        setPosting(false);
        Alert.alert(
          'Error',
          `Event was created, but club targeting failed: ${targetError.message}`
        );
        return;
      }
    }

    setPosting(false);
    Alert.alert('Success', 'Event created successfully.');
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (allowedOptions.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.text }]}>Create Event</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            You do not currently have permission to create any events.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={[styles.title, { color: colors.text }]}>Create Event</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Post an event for campus or a club you manage.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Audience</Text>
          <View style={styles.optionList}>
            {allowedOptions.map((option) => {
              const selected = selectedAudience === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                    selected && styles.optionButtonActive,
                  ]}
                  onPress={() => setSelectedAudience(option.value)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: selected ? '#ffffff' : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
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
              {selectedAudienceLabel}
            </Text>
          </View>

          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>Event Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.inputText,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter event description"
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
            />

            <Text style={[styles.label, { color: colors.text }]}>Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.inputText,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.inputText,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>Time</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM (24-hour)"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              selectionColor="#dc2626"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.inputText,
                },
              ]}
            />

            <Pressable
              style={[styles.createButton, posting && styles.disabledButton]}
              onPress={handleCreateEvent}
              disabled={posting}
            >
              <Text style={styles.createButtonText}>
                {posting ? 'Creating Event...' : 'Create Event'}
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
    paddingHorizontal: 24,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  optionList: {
    gap: 10,
    marginBottom: 14,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionButtonActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  optionButtonText: {
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
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});