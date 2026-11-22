import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthLayout, Field, FormError } from '@/components/AuthLayout';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button, T } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useAppTheme } from '@/theme/ThemeContext';

export default function LogIn() {
  const { c } = useAppTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };

  return (
    <AuthLayout
      title="Welcome back"
      footer={
        <>
          <Button label={busy ? 'Logging in…' : 'Log in'} kind="green" disabled={busy || !email || !password} onPress={submit} />
          <Button label="Create an account" kind="plain" onPress={() => router.replace('/sign-up' as never)} />
        </>
      }>
      <QuestieBubble text="Good to see you again. Your stamps are waiting." />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" textContentType="password" autoComplete="current-password" onSubmitEditing={submit} />
      <FormError text={error} />
      <Pressable accessibilityRole="button" onPress={() => router.push('/forgot-password' as never)} style={{ alignSelf: 'center', padding: 8 }}>
        <T size={15} weight="black" color={c.blueInk}>Forgot password?</T>
      </Pressable>
    </AuthLayout>
  );
}
