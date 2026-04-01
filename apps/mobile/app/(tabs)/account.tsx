import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import MobileHeader, { HEADER_BASE_HEIGHT } from '../../src/components/MobileHeader';

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  major: string | null;
  graduation_year: number | null;
  avatar_url: string | null;
  role: string | null;
};

type ClubMembershipRow = {
  club_code: string;
};

type MajorRow = {
  code: string;
  name?: string | null;
};

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('');
  const [joinedClubs, setJoinedClubs] = useState<string[]>([]);
  const [majors, setMajors] = useState<MajorRow[]>([]);
  const [showMajors, setShowMajors] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
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
      setIsLoggedIn(false);
      setUserId(null);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);
    setUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'user_id, first_name, last_name, full_name, major, graduation_year, avatar_url, role'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.log('ERROR LOADING PROFILE:', error);
      setLoading(false);
      return;
    }

    const profile = data as ProfileRow | null;

    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setFullName(profile.full_name ?? '');
      setMajor(profile.major ?? '');
      setGraduationYear(
        profile.graduation_year ? String(profile.graduation_year) : ''
      );
      setAvatarUrl(profile.avatar_url ?? '');
      setRole(profile.role ?? '');
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('club_members')
      .select('club_code')
      .eq('user_id', user.id);

    if (membershipError) {
      console.log('ERROR LOADING CLUB MEMBERSHIPS:', membershipError);
      setJoinedClubs([]);
    } else {
      const memberships = (membershipData as ClubMembershipRow[]) || [];
      setJoinedClubs(memberships.map((row) => row.club_code));
    }

    const { data: majorsData, error: majorsError } = await supabase
      .from('majors')
      .select('code, name')
      .order('code', { ascending: true });

    if (majorsError) {
      console.log('ERROR LOADING MAJORS:', majorsError);
      setMajors([]);
    } else {
      setMajors((majorsData as MajorRow[]) || []);
    }

    setLoading(false);
  }

  async function handlePickProfileImage() {
    if (!userId) return;

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      Alert.alert('Error', 'Could not read the selected image.');
      return;
    }

    try {
      setUploadingImage(true);

      const fileExt =
        asset.uri.split('.').pop()?.toLowerCase() ||
        asset.mimeType?.split('/')[1] ||
        'jpg';

      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const arrayBuffer = decode(asset.base64);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.log('UPLOAD ERROR:', uploadError);
        Alert.alert(
          'Error',
          `Could not upload profile picture: ${uploadError.message}`
        );
        setUploadingImage(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: newAvatarUrl,
        })
        .eq('user_id', userId);

      setUploadingImage(false);

      if (profileError) {
        console.log('PROFILE UPDATE ERROR:', profileError);
        Alert.alert(
          'Error',
          `Image uploaded, but profile could not be updated: ${profileError.message}`
        );
        return;
      }

      setAvatarUrl(newAvatarUrl);
      Alert.alert('Success', 'Profile picture updated.');
    } catch (err) {
      console.log('IMAGE PICK ERROR:', err);
      setUploadingImage(false);
      Alert.alert(
        'Error',
        'Something went wrong while updating your picture.'
      );
    }
  }

  async function handleSave() {
  if (!userId) return;

  setSaving(true);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const computedFullName =
    fullName.trim() || `${trimmedFirstName} ${trimmedLastName}`.trim();

  const parsedGraduationYear = graduationYear.trim()
    ? Number(graduationYear)
    : null;

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: trimmedFirstName || null,
      last_name: trimmedLastName || null,
      full_name: computedFullName || null,
      major: major.trim() || null,
      graduation_year: parsedGraduationYear,
      avatar_url: avatarUrl.trim() || null,
    })
    .eq('user_id', userId);

  setSaving(false);

  if (error) {
    console.log('ERROR SAVING PROFILE:', error);
    Alert.alert(
      'Error',
      `Could not save your profile changes: ${error.message}`
    );
    return;
  }

  setFullName(computedFullName);
  Alert.alert('Saved', 'Your account details were updated.');
}

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log('ERROR SIGNING OUT:', error);
      Alert.alert('Error', 'Could not sign out.');
      return;
    }

    setIsLoggedIn(false);
    setUserId(null);
    setFirstName('');
    setLastName('');
    setFullName('');
    setMajor('');
    setGraduationYear('');
    setAvatarUrl('');
    setRole('');
    setJoinedClubs([]);
    setShowMajors(false);
  }

  const headerHeight = HEADER_BASE_HEIGHT + insets.top;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <MobileHeader />
        <View style={[styles.centeredScreen, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <MobileHeader />
        <View style={[styles.centeredScreen, { paddingTop: headerHeight }]}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome</Text>
          <Text style={[styles.welcomeText, { color: colors.muted }]}>
            Log in or create an account to manage your CSUN Connect profile.
          </Text>

          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </Pressable>

          <Pressable
            style={[
              styles.signUpButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/sign-up')}
          >
            <Text style={[styles.signUpButtonText, { color: colors.text }]}>
              Sign Up
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <MobileHeader />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight, backgroundColor: colors.bg },
        ]}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>My Account</Text>
        <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
          Update your profile details.
        </Text>

        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={handlePickProfileImage}
            style={styles.avatarPressable}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {fullName?.trim()
                    ? fullName.trim().charAt(0).toUpperCase()
                    : 'U'}
                </Text>
              </View>
            )}

            {uploadingImage ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : (
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>Edit</Text>
              </View>
            )}
          </Pressable>

          <Text style={[styles.changePhotoText, { color: colors.muted }]}>
            Tap your photo to change it
          </Text>

          <Text style={[styles.previewName, { color: colors.text }]}>
            {fullName.trim() || 'Your Name'}
          </Text>
          <Text style={[styles.previewMeta, { color: colors.muted }]}>
            {major.trim() || 'No major set'}
          </Text>
          {role ? (
            <Text style={[styles.roleText, { color: colors.muted }]}>
              Role: {role}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.formCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>First Name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
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

          <Text style={[styles.label, { color: colors.text }]}>Last Name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
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

          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
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

          <Text style={[styles.label, { color: colors.text }]}>Major</Text>

          <Pressable
            style={[
              styles.input,
              styles.majorSelector,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setShowMajors((current) => !current)}
          >
            <Text
              style={{
                color: major ? colors.inputText : colors.placeholder,
                fontSize: 16,
              }}
            >
              {major || 'Select a major'}
            </Text>
          </Pressable>

          {showMajors ? (
            <View
              style={[
                styles.majorOptionsBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {majors.map((item, index) => (
                <Pressable
                  key={item.code}
                  style={[
                    styles.majorOptionButton,
                    index !== majors.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setMajor(item.code);
                    setShowMajors(false);
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>
                    {item.name ? `${item.name} (${item.code})` : item.code}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={[styles.label, { color: colors.text }]}>Graduation Year</Text>
          <TextInput
            value={graduationYear}
            onChangeText={setGraduationYear}
            placeholder="Graduation year"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
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

          <Text style={[styles.label, { color: colors.text }]}>Joined Clubs</Text>
          <View
            style={[
              styles.readOnlyBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {joinedClubs.length > 0 ? (
              joinedClubs.map((clubCode) => (
                <View key={clubCode} style={styles.clubChip}>
                  <Text style={styles.clubChipText}>{clubCode}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.readOnlyText, { color: colors.muted }]}>
                You have not joined any clubs yet.
              </Text>
            )}
          </View>

          <Text style={[styles.helperText, { color: colors.muted }]}>
            Join or leave clubs from the Clubs page.
          </Text>

          <Pressable
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.signOutButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={handleSignOut}
          >
            <Text style={[styles.signOutButtonText, { color: colors.text }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centeredScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  signUpButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    marginBottom: 16,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarPressable: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatarOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  changePhotoText: {
    fontSize: 13,
    marginBottom: 10,
  },
  previewName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewMeta: {
    fontSize: 15,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  majorSelector: {
    justifyContent: 'center',
  },
  majorOptionsBox: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  majorOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readOnlyText: {
    fontSize: 14,
  },
  clubChip: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clubChipText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});