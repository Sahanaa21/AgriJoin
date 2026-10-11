import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  CROPS,
  SKILLS,
  type Crop,
  type Skill,
} from '@agrijoin/shared';
import { useAuth } from '../../lib/auth';
import { getFarmerProfile, getLabourerProfile, getMyPhone } from '../../lib/queries';
import { Button, Card, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function ProfileTab() {
  const { profile, userId, role, signOut } = useAuth();
  const isFarmer = role === 'farmer';
  const [phone, setPhone] = useState<string | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [wage, setWage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      setPhone(await getMyPhone(userId));
      if (isFarmer) {
        const fp = await getFarmerProfile(userId);
        setCrops((fp?.main_crops ?? []) as Crop[]);
      } else {
        const lp = await getLabourerProfile(userId);
        setSkills((lp?.skills ?? []) as Skill[]);
        setWage(lp?.expected_wage ?? null);
      }
      setLoading(false);
    }
    void load();
  }, [userId, isFarmer]);

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{profile?.full_name}</Text>
        <Text style={{ color: colors.muted, textTransform: 'capitalize' }}>{role}</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          📍 {profile?.village ? `${profile.village}, ` : ''}
          {profile?.district}, {profile?.state}
        </Text>
        {phone ? <Text style={{ color: colors.muted, marginTop: 2 }}>📱 {phone} (private)</Text> : null}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>{isFarmer ? 'Main crops' : 'Skills'}</Text>
        <Text style={{ color: colors.muted }}>{(isFarmer ? crops : skills).join(', ') || '—'}</Text>
        {!isFarmer && wage != null ? <Text style={{ color: colors.muted, marginTop: 6 }}>Expected wage: ₹{wage}/day</Text> : null}
      </Card>

      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12, marginBottom: 12 }}>
        To edit detailed profile fields, use the AgriJoin website. Profile editing on mobile is on the roadmap.
      </Text>

      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </ScrollView>
  );
}
