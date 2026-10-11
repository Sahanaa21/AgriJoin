import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Loading } from '../components/ui';

function ConfigNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <View style={{ backgroundColor: '#FEF3C7', padding: 10 }}>
      <Text style={{ color: '#92400E', fontSize: 12, textAlign: 'center' }}>
        Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart Expo.
      </Text>
    </View>
  );
}

function Guard() {
  const { loading, userId, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthed = segments[0] === '(tabs)';
    const onboarding = segments[0] === 'role' || segments[0] === 'onboarding';

    if (!userId && (inAuthed || onboarding)) {
      router.replace('/');
    } else if (userId && !profile && inAuthed) {
      router.replace('/role');
    } else if (userId && profile && !inAuthed && segments[0] !== 'job' && segments[0] !== 'post-job' && segments[0] !== 'chat') {
      router.replace('/(tabs)');
    }
  }, [loading, userId, profile, segments]);

  if (loading) return <Loading label="Loading…" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="role" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" options={{ headerShown: true, title: 'Job details' }} />
      <Stack.Screen name="post-job" options={{ headerShown: true, title: 'Post a job' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Conversation' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <ConfigNotice />
        <Guard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
