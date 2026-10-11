import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Role } from '@agrijoin/shared';
import { Button, Screen } from '../components/ui';
import { colors } from '../lib/theme';

const CARDS: { role: Role; title: string; blurb: string; bullets: string[]; accent: string }[] = [
  {
    role: 'farmer',
    title: 'Farmer',
    blurb: 'Post jobs and hire agricultural workers',
    bullets: ['Post job listings', 'Find skilled workers', 'Manage your farm jobs', 'Chat with labourers'],
    accent: colors.green,
  },
  {
    role: 'labourer',
    title: 'Labourer',
    blurb: 'Find nearby farm work and earn money',
    bullets: ['Browse nearby jobs', 'Apply with one tap', 'Track your applications', 'Chat with farmers'],
    accent: colors.accent,
  },
];

export default function RoleSelect() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 16 }}>I am a…</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>Choose how you want to use AgriJoin.</Text>
      {CARDS.map((c) => {
        const on = selected === c.role;
        return (
          <Pressable
            key={c.role}
            onPress={() => setSelected(c.role)}
            style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              borderWidth: on ? 2 : 1,
              borderColor: on ? c.accent : colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{c.title}</Text>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>{c.blurb}</Text>
            {c.bullets.map((b) => (
              <Text key={b} style={{ color: colors.text, marginTop: 2 }}>
                ✓ {b}
              </Text>
            ))}
          </Pressable>
        );
      })}
      <View style={{ marginTop: 8 }}>
        <Button title="Continue" onPress={() => selected && router.push({ pathname: '/onboarding', params: { role: selected } })} disabled={!selected} />
      </View>
    </Screen>
  );
}
