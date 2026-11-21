import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { FeedbackProvider } from '@/state/feedback';
import { GameProvider } from '@/state/game';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppThemeProvider>
      <FeedbackProvider>
        <GameProvider>
          <Root />
        </GameProvider>
      </FeedbackProvider>
    </AppThemeProvider>
  );
}

function Root() {
  const { c, isDark } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="station/[id]" />
      </Stack>
      <AnnouncementBanner />
    </>
  );
}
