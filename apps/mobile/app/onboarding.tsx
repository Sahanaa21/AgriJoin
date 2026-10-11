import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CROPS,
  SKILLS,
  STATES,
  WORK_CATEGORIES,
  type Crop,
  type Role,
  type Skill,
  type State,
  type WorkCategory,
} from '@agrijoin/shared';
import { useAuth } from '../lib/auth';
import { saveCoreProfile, saveFarmerProfile, saveLabourerProfile } from '../lib/queries';
import { Button, Card, Chip, Field, Screen } from '../components/ui';
import { colors } from '../lib/theme';

export default function Onboarding() {
  const { role } = useLocalSearchParams<{ role: Role }>();
  const isFarmer = role === 'farmer';
  const { userId, refreshProfile } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [stateSel, setStateSel] = useState<State | null>(null);
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prefs, setPrefs] = useState<WorkCategory[]>([]);
  const [wage, setWage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit() {
    if (!userId) return;
    if (!fullName.trim()) return setError('Full name is required');
    if (!stateSel) return setError('Select your state');
    if (!district.trim()) return setError('District is required');
    if (isFarmer && crops.length === 0) return setError('Select at least one crop');
    if (!isFarmer && skills.length === 0) return setError('Select at least one skill');
    setError(null);
    setSaving(true);
    try {
      await saveCoreProfile(userId, role as Role, { full_name: fullName.trim(), state: stateSel, district: district.trim(), village: village.trim() || undefined }, phone.trim() || undefined);
      if (isFarmer) {
        await saveFarmerProfile(userId, { farm_size_acres: farmSize ? Number(farmSize) : null, main_crops: crops });
      } else {
        await saveLabourerProfile(userId, { skills, work_preferences: prefs, expected_wage: wage ? Number(wage) : null, availability: 'available_now' });
      }
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12 }}>Set Up Your Profile</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{isFarmer ? 'Tell us about your farm' : 'Tell us about your work'}</Text>
      <Card>
        {error ? <Text style={{ color: '#DC2626', marginBottom: 10 }}>{error}</Text> : null}
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
        <Field label="Mobile number (optional, private)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 99999 99999" />
        <Field label="District" value={district} onChangeText={setDistrict} placeholder="e.g. Mysuru" />
        <Field label="Village / locality (optional)" value={village} onChangeText={setVillage} placeholder="e.g. Betta" />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>State</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {STATES.map((s) => (
            <Chip key={s} label={s} active={stateSel === s} onPress={() => setStateSel(s)} />
          ))}
        </View>

        {isFarmer ? (
          <>
            <Field label="Farm size in acres (optional)" value={farmSize} onChangeText={setFarmSize} keyboardType="numeric" placeholder="e.g. 5.5" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Main crops</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CROPS.map((c) => (
                <Chip key={c} label={c} active={crops.includes(c)} onPress={() => toggle(crops, c, setCrops)} />
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Your skills</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {SKILLS.map((s) => (
                <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggle(skills, s, setSkills)} />
              ))}
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 10, marginBottom: 6 }}>Preferred work (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {WORK_CATEGORIES.map((w) => (
                <Chip key={w} label={w} active={prefs.includes(w)} onPress={() => toggle(prefs, w, setPrefs)} />
              ))}
            </View>
            <View style={{ marginTop: 10 }}>
              <Field label="Expected wage ₹/day (optional)" value={wage} onChangeText={setWage} keyboardType="numeric" placeholder="e.g. 450" />
            </View>
          </>
        )}

        <Button title="Create Profile & Continue" onPress={submit} loading={saving} />
      </Card>
    </Screen>
  );
}
