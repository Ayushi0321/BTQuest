import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeValue = {
  c: Palette;          // current colors
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;  // flips between light and dark
};

const ThemeCtx = createContext<ThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({
      c: isDark ? dark : light,
      isDark,
      mode,
      setMode,
      toggle: () => setMode(isDark ? 'light' : 'dark'),
    }),
    [isDark, mode]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme(): ThemeValue {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return v;
}
