import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { initializeDatabaseSchema } from '@core/storage';
import { CATEGORY_ACCENT_COLORS, useAppTheme, useThemeStore } from '@core/theme';
import { FolderExplorerScreen } from '@features/browser';
import type { ThemePalette } from '@core/theme';

export type AppNavigatorParamList = {
  Dashboard: undefined;
  FolderExplorer: { category: 'AUDIO' | 'VIDEO' | 'PHOTO' | 'PDF' | 'OTHER_DOC' };
};

const Stack = createNativeStackNavigator<AppNavigatorParamList>();

const PALETTES: { id: Exclude<ThemePalette, 'dynamic'>; label: string }[] = [
  { id: 'indigo', label: 'Indigo' },
  { id: 'orange', label: 'Orange' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'crimson', label: 'Crimson' },
];

const CATEGORY_LABELS: { key: keyof typeof CATEGORY_ACCENT_COLORS; label: string }[] = [
  { key: 'audio', label: 'Audio' },
  { key: 'video', label: 'Video' },
  { key: 'photo', label: 'Photo' },
  { key: 'pdf', label: 'PDF' },
  { key: 'doc', label: 'Docs' },
];

function DashboardScreen(): React.JSX.Element {
  const theme = useAppTheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const isAmoledBlack = useThemeStore((state) => state.isAmoledBlack);
  const palette = useThemeStore((state) => state.palette);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const setAmoledBlack = useThemeStore((state) => state.setAmoledBlack);
  const setPalette = useThemeStore((state) => state.setPalette);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    initializeDatabaseSchema()
      .then(() => {
        if (isMounted) {
          setStorageReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStorageReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView
      testID="app-root-shell"
      contentContainerStyle={[styles.content, { backgroundColor: theme.appColors.background }]}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="play-box-multiple"
          size={52}
          color={theme.appColors.primary}
        />
        <Text style={[styles.title, { color: theme.appColors.textPrimary }]}>Kinetix</Text>
        <Text style={[styles.subtitle, { color: theme.appColors.textSecondary }]}>
          Theme preview
        </Text>
        <View
          testID="db-status-badge"
          style={[styles.storageBadge, { backgroundColor: storageReady ? '#22C55E' : '#F59E0B' }]}
        >
          <Text style={styles.storageBadgeText}>
            {storageReady ? 'SQLite + MMKV Ready' : 'Initializing storage...'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.appColors.surface,
            borderColor: theme.appColors.border,
          },
        ]}
        testID="theme-preview-card"
      >
        <Text style={[styles.sectionTitle, { color: theme.appColors.textPrimary }]}>
          Category colors
        </Text>
        <View style={styles.badges}>
          {CATEGORY_LABELS.map(({ key, label }) => (
            <View
              key={key}
              style={[styles.badge, { backgroundColor: CATEGORY_ACCENT_COLORS[key] }]}
            >
              <Text style={styles.badgeText}>{label}</Text>
            </View>
          ))}
        </View>

        <Text
          style={[
            styles.sectionTitle,
            styles.controlHeading,
            { color: theme.appColors.textPrimary },
          ]}
        >
          Appearance
        </Text>
        <View style={styles.controls}>
          <ThemeButton
            label="Light"
            selected={themeMode === 'light'}
            onPress={() => setThemeMode('light')}
            theme={theme}
          />
          <ThemeButton
            label="Dark"
            selected={themeMode === 'dark'}
            onPress={() => setThemeMode('dark')}
            theme={theme}
          />
          <ThemeButton
            label="System"
            selected={themeMode === 'system'}
            onPress={() => setThemeMode('system')}
            theme={theme}
          />
          <ThemeButton
            label={`AMOLED ${isAmoledBlack ? 'On' : 'Off'}`}
            selected={isAmoledBlack}
            onPress={() => setAmoledBlack(!isAmoledBlack)}
            theme={theme}
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            styles.controlHeading,
            { color: theme.appColors.textPrimary },
          ]}
        >
          Color palette
        </Text>
        <View style={styles.controls}>
          {PALETTES.map(({ id, label }) => (
            <ThemeButton
              key={id}
              label={label}
              selected={palette === id}
              onPress={() => setPalette(id)}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

interface ThemeButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}

function ThemeButton({ label, selected, onPress, theme }: ThemeButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: selected ? theme.appColors.primary : theme.appColors.surfaceVariant,
          borderColor: theme.appColors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: selected ? theme.appColors.onPrimary : theme.appColors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FolderExplorer"
          component={FolderExplorerScreen}
          options={({ route }) => ({
            title: `${route.params.category.toLowerCase()} folder`,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 24,
  },
  header: { alignItems: 'center' },
  title: { marginTop: 8, fontSize: 28, fontWeight: '600' },
  subtitle: { marginTop: 4, fontSize: 15 },
  storageBadge: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  storageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  controlHeading: { marginTop: 24, marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
});

export default AppNavigator;
