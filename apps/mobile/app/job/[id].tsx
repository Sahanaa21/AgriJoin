import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { canApply, formatWage, type JobApplication, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../../lib/auth';
import { applyToJob, getJob, getMyApplicationForJob, getOrCreateConversation } from '../../lib/queries';
import { Badge, Button, Card, Field, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function JobDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, role } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobWithFarmer | null>(null);
  const [myApp, setMyApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const j = await getJob(id);
      setJob(j);
      if (j && userId && role === 'labourer') setMyApp(await getMyApplicationForJob(id, userId));
    } finally {
      setLoading(false);
    }
  }, [id, userId, role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <Loading />;
  if (!job) return <Text style={{ padding: 20, color: colors.muted }}>Job not found.</Text>;

  const isOwner = userId === job.farmer_id;
  const isLabourer = role === 'labourer';
  const state = canApply(job.status, job.end_date, Boolean(myApp));

  async function apply() {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      setMyApp(await applyToJob(id, message.trim() || undefined));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not apply');
    } finally {
      setBusy(false);
    }
  }

  async function messageFarmer() {
    try {
      const conv = await getOrCreateConversation(job!.farmer_id, job!.id);
      router.push(`/chat/${conv}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open chat');
    }
  }

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ backgroundColor: colors.accent, borderRadius: 16, padding: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '800' }}>{job.title}</Text>
          <Badge status={job.status} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{job.category}</Text>
        <Text style={{ color: colors.white, marginTop: 6 }}>
          {formatWage(job.wage, job.wage_unit)} · {job.district}
        </Text>
      </View>

      <Card style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 4 }}>Farm Details</Text>
        <Text style={{ color: colors.text }}>{job.farmer_name}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          {job.farmer_district}, {job.farmer_state}
        </Text>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Job Details</Text>
        <Text style={{ color: colors.text, marginBottom: 8 }}>{job.description}</Text>
        <Row label="Start date" value={job.start_date} />
        <Row label="End date" value={job.end_date} />
        <Row label="Workers needed" value={`${job.accepted_count ?? 0}/${job.workers_needed} filled`} />
        <Row label="Location" value={`${job.locality}, ${job.district}, ${job.state}`} />
        <Row label="Daily wage" value={formatWage(job.wage, job.wage_unit)} />
        {job.crop ? <Row label="Crop" value={job.crop} /> : null}
        {job.requirements ? <Row label="Requirements" value={job.requirements} /> : null}
      </Card>

      {err ? <Text style={{ color: '#DC2626', marginTop: 12 }}>{err}</Text> : null}

      <View style={{ marginTop: 16 }}>
        {isOwner ? (
          <Button title="Review applications" onPress={() => router.push('/(tabs)/applications')} />
        ) : isLabourer ? (
          myApp ? (
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text }}>✓ Application submitted</Text>
              <Badge status={myApp.status} />
            </Card>
          ) : state.ok ? (
            <Card>
              <Field label="Message to the farmer (optional)" value={message} onChangeText={setMessage} placeholder="Introduce yourself…" multiline />
              <Button title="Apply Now" onPress={apply} loading={busy} />
              <View style={{ height: 10 }} />
              <Button title="Message farmer" variant="ghost" onPress={messageFarmer} />
            </Card>
          ) : (
            <Card style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
              <Text style={{ color: '#92400E' }}>{state.reason}</Text>
            </Card>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}
