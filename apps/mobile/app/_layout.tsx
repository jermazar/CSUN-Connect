import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { StatusBar } from 'react-native';

function AppNavigator() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}