import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  inputBg: string;
  inputText: string;
  placeholder: string;
  tabInactive: string;
  tabActive: string;
  statusBar: 'light-content' | 'dark-content';
};

type ThemeContextValue = {
  mode: ThemeMode;
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = 'csun-connect-theme';

const lightColors: ThemeColors = {
  bg: '#f9fafb',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  inputBg: '#ffffff',
  inputText: '#111827',
  placeholder: '#6b7280',
  tabInactive: '#6b7280',
  tabActive: '#dc2626',
  statusBar: 'dark-content',
};

const darkColors: ThemeColors = {
  bg: '#111827',
  card: '#1f2937',
  border: '#374151',
  text: '#f9fafb',
  muted: '#9ca3af',
  inputBg: '#111827',
  inputText: '#f9fafb',
  placeholder: '#9ca3af',
  tabInactive: '#9ca3af',
  tabActive: '#ef4444',
  statusBar: 'light-content',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const savedTheme = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setModeState(savedTheme);
      }
    } catch (error) {
      console.log('ERROR LOADING THEME:', error);
    } finally {
      setLoaded(true);
    }
  }

  async function setMode(modeValue: ThemeMode) {
    setModeState(modeValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, modeValue);
    } catch (error) {
      console.log('ERROR SAVING THEME:', error);
    }
  }

  async function toggleTheme() {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.log('ERROR SAVING THEME:', error);
    }
  }

  const value = useMemo(
    () => ({
      mode,
      isDarkMode: mode === 'dark',
      colors: mode === 'dark' ? darkColors : lightColors,
      toggleTheme,
      setMode,
    }),
    [mode]
  );

  if (!loaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}