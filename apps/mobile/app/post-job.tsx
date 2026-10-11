import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  jobSchema,
  CROPS,
  STATES,
  WORK_CATEGORIES,
  type Crop,
  type State,
  type WorkCategory,
} from '@agrijoin/shared';
import { useAuth } from '../lib/auth';
import { createJob } from '../lib/queries';
import { useLocation } from '../lib/useLocation';
import { Button, Card, Chip, Field, Screen } from '../components/ui';
import { colors } from '../lib/theme';

export default function PostJob() {
  const { userId } = useAuth();
  const router = useRouter();
  const loc = useLocation();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkCategory | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [description, setDescription] = useState('');
  const [workers, setWorkers] = useState('1');
  const [wage, setWage] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [stateSel, setStateSel] = useState<State | null>(null);
  const [district, setDistrict] = useState('');
  const [locality, setLocality] = useState('');
  const [requirements, setRequirements] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!userId) return;
    const candidate = {
      title,
      category: category ?? undefined,
      crop: crop ?? undefined,
      description,
      workers_needed: Number(workers),
      wage: Number(wage),
      wage_unit: 'day' as const,
      start_date: start,
      end_date: end,
      state: stateSel ?? undefined,
      district,
      locality,
      requirements: requirements || undefined,
      images: [],
    };
    const parsed = jobSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createJob(userId, {
        ...parsed.data,
        crop: parsed.data.crop ?? null,
        requirements: parsed.data.requirements ?? null,
        lat: loc.coords?.lat ?? null,
        lng: loc.coords?.lng ?? null,
      });
      router.replace('/(tabs)/jobs');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post job');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Card>
        {error ? <Text style={{ color: '#DC2626', marginBottom: 10 }}>{error}</Text> : null}
        <Field label="Job title" value={title} onChangeText={setTitle} placeholder="e.g. Cotton Picking" />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Work category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {WORK_CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Crop (optional)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {CROPS.map((c) => (
            <Chip key={c} label={c} active={crop === c} onPress={() => setCrop(crop === c ? null : c)} />
          ))}
        </View>

        <Field label="Description" value={description} onChangeText={setDescription} placeholder="What the work involves…" multiline />
        <Field label="Workers needed" value={workers} onChangeText={setWorkers} keyboardType="numeric" />
        <Field label="Daily wage (₹)" value={wage} onChangeText={setWage} keyboardType="numeric" placeholder="e.g. 450" />
        <Field label="Start date (YYYY-MM-DD)" value={start} onChangeText={setStart} placeholder="2026-08-01" />
        <Field label="End date (YYYY-MM-DD)" value={end} onChangeText={setEnd} placeholder="2026-08-20" />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>State</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {STATES.map((s) => (
            <Chip key={s} label={s} active={stateSel === s} onPress={() => setStateSel(s)} />
          ))}
        </View>

        <Field label="District" value={district} onChangeText={setDistrict} placeholder="e.g. Dharwad" />
        <Field label="Village / locality" value={locality} onChangeText={setLocality} placeholder="e.g. Hubli Taluk" />
        <Field label="Requirements (optional)" value={requirements} onChangeText={setRequirements} placeholder="e.g. Experience preferred" multiline />

        <View style={{ marginBottom: 12 }}>
          <Button
            title={loc.coords ? `Location set (${loc.coords.lat.toFixed(3)}, ${loc.coords.lng.toFixed(3)})` : 'Add my location (optional)'}
            variant="ghost"
            onPress={loc.request}
          />
        </View>

        <Button title="Post Job Now" onPress={submit} loading={saving} />
      </Card>
    </Screen>
  );
}
