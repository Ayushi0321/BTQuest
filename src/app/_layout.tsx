import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

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
      <Root />
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
      </Stack>
    </>
  );
}
