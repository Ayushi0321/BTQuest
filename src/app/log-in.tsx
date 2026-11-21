import { router } from 'expo-router';
import { useState } from 'react';

import { AuthLayout, Field, FormError } from '@/components/AuthLayout';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';

export default function LogIn() {
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
          <Button label="Create an account" kind="plain" onPress={() => router.replace('/sign-up')} />
        </>
      }>
      <QuestieBubble text="Good to see you again. Your stamps are waiting." />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" textContentType="password" autoComplete="current-password" onSubmitEditing={submit} />
      <FormError text={error} />
    </AuthLayout>
  );
}
