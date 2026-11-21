import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Kicker, ProgressBar } from '@/components/ui';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

export function BackButton({ onPress }: { onPress?: () => void }) {
  const { c } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress ?? (() => router.back())}
      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
    </Pressable>
  );
}

/** Full-screen layout for sign-in and onboarding: header, scrolling body, buttons pinned at the bottom. */
export function AuthLayout({ back = true, progress, title, children, footer }: { back?: boolean; progress?: number; title?: string; children: ReactNode; footer: ReactNode }) {
  const { c } = useAppTheme();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {back || progress !== undefined || title ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 8 }}>
            {back ? <BackButton /> : null}
            {progress !== undefined ? <View style={{ flex: 1 }}><ProgressBar value={progress} color={c.green} /></View> : null}
            {title && progress === undefined ? <Text style={{ flex: 1, fontFamily: font.black, fontSize: 26, color: c.text }}>{title}</Text> : null}
          </View>
        ) : null}
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 18, gap: 14 }}>
          {children}
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingBottom: 12, gap: 10 }}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Field({ label, onFocus, onBlur, ...props }: TextInputProps & { label: string }) {
  const { c } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Kicker>{label}</Kicker>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{ height: 54, borderRadius: 16, borderWidth: 2, borderColor: focused ? c.blue : c.line, backgroundColor: c.card, paddingHorizontal: 16, fontFamily: font.bold, fontSize: 16, color: c.text }}
        {...props}
      />
    </View>
  );
}

export function FormError({ text }: { text: string | null }) {
  const { c } = useAppTheme();
  if (!text) return null;
  return (
    <View accessibilityLiveRegion="assertive" style={{ backgroundColor: c.redTint, borderRadius: 14, padding: 12 }}>
      <Text style={{ fontFamily: font.heavy, fontSize: 14, color: c.redInk }}>{text}</Text>
    </View>
  );
}
