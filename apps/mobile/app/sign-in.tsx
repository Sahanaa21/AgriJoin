import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { signInSchema } from '@agrijoin/shared';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Screen } from '../components/ui';
import { colors } from '../lib/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 4 }}>Welcome back</Text>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>Sign in with your email and password.</Text>
      <Card>
        {error ? <Text style={{ color: '#DC2626', marginBottom: 10 }}>{error}</Text> : null}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
        <Button title="Sign In" onPress={submit} loading={loading} />
      </Card>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
        <Text style={{ color: colors.muted }}>No account? </Text>
        <Link href="/sign-up" style={{ color: colors.green, fontWeight: '700' }}>
          Create one
        </Link>
      </View>
    </Screen>
  );
}
