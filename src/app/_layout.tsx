import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { AuthProvider, useAuth } from '@/state/auth';
import { FeedbackProvider } from '@/state/feedback';
import { GameProvider } from '@/state/game';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  if (!loaded) return null;

  return (
    <AppThemeProvider>
      <FeedbackProvider>
        <AuthProvider>
          <GameProvider>
            <Root />
          </GameProvider>
        </AuthProvider>
      </FeedbackProvider>
    </AppThemeProvider>
  );
}

function Root() {
  const { c, isDark } = useAppTheme();
  const { ready, session, onboarded } = useAuth();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  const signedIn = !!session;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="station/[id]" />
          <Stack.Screen name="art/[id]" />
          <Stack.Screen name="questie" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="log-in" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" />
      </Stack>
      <AnnouncementBanner />
    </>
  );
}
