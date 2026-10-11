import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { formatWage, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../../lib/auth';
import { listMyJobs, listOpenJobs, setJobStatus } from '../../lib/queries';
import { useLocation } from '../../lib/useLocation';
import { JobCard } from '../../components/JobCard';
import { Badge, Button, Card, Empty, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function JobsTab() {
  const { role } = useAuth();
  return role === 'farmer' ? <ManageJobs /> : <BrowseJobs />;
}

function BrowseJobs() {
  const loc = useLocation();
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setJobs(await listOpenJobs(loc.coords, search || undefined));
    } finally {
      setLoading(false);
    }
  }, [loc.coords, search]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <TextInput
        placeholder="Search jobs…"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={load}
        style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 }}
      />
      {!loc.coords && (
        <Text onPress={loc.request} style={{ color: colors.green, marginBottom: 10 }}>
          📍 Enable location to see distances
        </Text>
      )}
      {loading ? (
        <Loading />
      ) : jobs.length === 0 ? (
        <Empty title="No open jobs found" description="Try a different search." />
      ) : (
        jobs.map((j) => <JobCard key={j.id} job={j} />)
      )}
    </ScrollView>
  );
}

function ManageJobs() {
  const { userId } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setJobs(await listMyJobs(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function change(id: string, status: string) {
    setBusy(id);
    try {
      const updated = await setJobStatus(id, status);
      setJobs((p) => p.map((j) => (j.id === id ? { ...j, status: updated.status } : j)));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Button title="+ Post a Job" onPress={() => router.push('/post-job')} />
      <View style={{ height: 14 }} />
      {jobs.length === 0 ? (
        <Empty title="No jobs yet" description="Post your first agricultural job." />
      ) : (
        jobs.map((j) => (
          <Card key={j.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{j.title}</Text>
              <Badge status={j.status} />
            </View>
            <Text style={{ color: colors.muted, marginTop: 2 }}>
              {j.category} · {formatWage(j.wage, j.wage_unit)} · {j.district}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              {j.accepted_count ?? 0}/{j.workers_needed} filled
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <Text onPress={() => router.push(`/job/${j.id}`)} style={{ color: colors.green, fontWeight: '600' }}>
                View
              </Text>
              {j.status === 'open' && (
                <Text onPress={() => !busy && change(j.id, 'filled')} style={{ color: colors.accent, fontWeight: '600' }}>
                  Mark filled
                </Text>
              )}
              {j.status === 'open' ? (
                <Text onPress={() => !busy && change(j.id, 'closed')} style={{ color: '#DC2626', fontWeight: '600' }}>
                  Close
                </Text>
              ) : (
                <Text onPress={() => !busy && change(j.id, 'open')} style={{ color: colors.green, fontWeight: '600' }}>
                  Reopen
                </Text>
              )}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
