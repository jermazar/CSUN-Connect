import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,

        tabBarStyle: {
          height: 72,
          paddingBottom: 12,
          paddingTop: 4,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: -2,
        },

        tabBarIconStyle: {
          marginBottom: -2,
        },

        tabBarItemStyle: {
          paddingVertical: 2,
        },

        tabBarIcon: ({ color, focused }) => {
          let iconName: any;

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'account') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="groups" options={{ title: 'Clubs' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}