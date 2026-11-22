import { useState } from 'react';

import { AuthLayout, Field, FormError } from '@/components/AuthLayout';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button } from '@/components/ui';
import { useAuth } from '@/state/auth';

export default function ForgotPassword() {
  const { sendResetLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const err = await sendResetLink(email);
    setError(err);
    if (!err) setSent(true);
    setBusy(false);
  };

  return (
    <AuthLayout
      title="Reset password"
      footer={<Button label={busy ? 'Sending…' : sent ? 'Send again' : 'Email me a link'} kind={sent ? 'plain' : 'green'} disabled={busy || !email} onPress={send} />}>
      <QuestieBubble text={sent ? `Sent! Open the email on this phone and tap the link.` : 'Enter your email and I’ll send you a reset link.'} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" autoComplete="email" onSubmitEditing={send} />
      <FormError text={error} />
    </AuthLayout>
  );
}
