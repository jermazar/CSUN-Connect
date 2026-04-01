import { View, Pressable, StyleSheet, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export const HEADER_BASE_HEIGHT = 86;

type MobileHeaderProps = {
  showComposeButton?: boolean;
  composeDisabled?: boolean;
  onComposePress?: () => void;
};

export default function MobileHeader({
  showComposeButton = false,
  composeDisabled = false,
  onComposePress,
}: MobileHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.stickyHeader,
        {
          paddingTop: insets.top + 6,
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          style={[
            styles.headerIconButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/csun-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {showComposeButton ? (
          <Pressable
            style={[
              styles.composeButton,
              composeDisabled && styles.composeButtonDisabled,
            ]}
            onPress={onComposePress}
          >
            <Text
              style={[
                styles.composeButtonText,
                composeDisabled && styles.composeButtonTextDisabled,
              ]}
            >
              +
            </Text>
          </Pressable>
        ) : (
          <View style={styles.rightSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 170,
    height: 38,
  },
  composeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  composeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  composeButtonText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  composeButtonTextDisabled: {
    color: '#f3f4f6',
  },
  rightSpacer: {
    width: 42,
    height: 42,
  },
});