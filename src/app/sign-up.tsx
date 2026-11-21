import { router } from 'expo-router';
import { useState } from 'react';

import { AuthLayout, Field, FormError } from '@/components/AuthLayout';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';

export default function SignUp() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(await signUp(username, email, password));
    setBusy(false);
  };

  return (
    <AuthLayout
      progress={0.5}
      footer={
        <>
          <Button label={busy ? 'Creating…' : 'Create account'} kind="green" disabled={busy || !username || !email || password.length < 6} onPress={submit} />
          <Button label="I already have an account" kind="plain" onPress={() => router.replace('/log-in')} />
        </>
      }>
      <QuestieBubble text="Pick a name other riders will see on the board." />
      <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="metro_maya" textContentType="username" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" textContentType="newPassword" autoComplete="new-password" onSubmitEditing={submit} />
      <FormError text={error} />
    </AuthLayout>
  );
}
