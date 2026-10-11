import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { signUpSchema } from '@agrijoin/shared';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Screen } from '../components/ui';
import { colors } from '../lib/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = signUpSchema.safeParse({
      full_name: fullName,
      email,
      phone: phone || undefined,
      password,
      confirm_password: confirm,
      role: 'labourer',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, password, fullName);
      if (needsConfirmation) {
        setInfo('Account created. Confirm your email, then sign in. (For demos, disable email confirmation in Supabase.)');
        return;
      }
      router.replace('/role');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 4 }}>Join AgriJoin</Text>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>Create an account to find farm work or workers.</Text>
      <Card>
        {error ? <Text style={{ color: '#DC2626', marginBottom: 10 }}>{error}</Text> : null}
        {info ? <Text style={{ color: colors.green, marginBottom: 10 }}>{info}</Text> : null}
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Mobile number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 99999 99999" hint="Kept private — never shown to others by default." />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
        <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••" />
        <Button title="Continue" onPress={submit} loading={loading} />
      </Card>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
        <Text style={{ color: colors.muted }}>Already have an account? </Text>
        <Link href="/sign-in" style={{ color: colors.green, fontWeight: '700' }}>
          Sign in
        </Link>
      </View>
    </Screen>
  );
}
