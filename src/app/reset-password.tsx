import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { AuthLayout, Field, FormError } from '@/components/AuthLayout';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';

function authParams(url: string | null): URLSearchParams {
  const out = new URLSearchParams();
  if (!url) return out;
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  for (const part of [query, hash]) new URLSearchParams(part).forEach((v, k) => out.set(k, v));
  return out;
}

export default function ResetPassword() {
  const url = Linking.useLinkingURL();
  const { session, startRecovery, setNewPassword } = useAuth();
  const params = useMemo(() => authParams(url), [url]);
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const linkError = params.get('error_description') ? 'This link is invalid or expired. Request a new one.' : null;
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (access && refresh) startRecovery(access, refresh).then(setRecoveryError);
  }, [access, refresh, startRecovery]);

  const save = async () => {
    setBusy(true);
    const err = await setNewPassword(password);
    setBusy(false);
    if (err) setError(err);
    else router.replace('/');
  };

  const problem = linkError ?? recoveryError ?? (!session && !access ? 'This link is invalid or expired. Request a new one.' : null);

  if (problem) {
    return (
      <AuthLayout back={false} title="Reset password" footer={<Button label="Back" kind="plain" onPress={() => router.replace('/')} />}>
        <FormError text={problem} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      back={false}
      title="New password"
      footer={<Button label={busy ? 'Saving…' : 'Save password'} kind="green" disabled={busy || !session || password.length < 6} onPress={save} />}>
      <QuestieBubble text={session ? 'Pick a new password.' : 'Opening your link…'} />
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" textContentType="newPassword" autoComplete="new-password" onSubmitEditing={save} />
      <FormError text={error} />
    </AuthLayout>
  );
}
