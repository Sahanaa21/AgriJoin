import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ApplicationWithRelations } from '@agrijoin/shared';
import { useAuth } from '../../lib/auth';
import { listApplicationsForMyJobs, listMyApplications, setApplicationStatus } from '../../lib/queries';
import { Badge, Card, Empty, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function ApplicationsTab() {
  const { userId, role } = useAuth();
  const isFarmer = role === 'farmer';
  const router = useRouter();
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setApps(isFarmer ? await listApplicationsForMyJobs(userId) : await listMyApplications(userId));
    } finally {
      setLoading(false);
    }
  }, [userId, isFarmer]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function act(id: string, status: string) {
    setBusy(id);
    setErr(null);
    try {
      const updated = await setApplicationStatus(id, status);
      setApps((p) => p.map((a) => (a.id === id ? { ...a, status: updated.status } : a)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 }}>
        {isFarmer ? 'Applications' : 'My Applications'} ({apps.length})
      </Text>
      {err ? <Text style={{ color: '#DC2626', marginBottom: 10 }}>{err}</Text> : null}
      {apps.length === 0 ? (
        <Empty title="Nothing here yet" description={isFarmer ? 'Applications to your jobs appear here.' : 'Browse jobs and apply.'} />
      ) : (
        apps.map((a) => (
          <Card key={a.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {isFarmer ? a.labourer?.full_name ?? 'Labourer' : a.job?.title ?? 'Job'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {isFarmer ? a.job?.title : `${a.job?.district ?? ''} · ₹${a.job?.wage ?? ''}/day`}
                </Text>
              </View>
              <Badge status={a.status} />
            </View>
            {a.message ? <Text style={{ marginTop: 8, color: colors.text, backgroundColor: colors.light, padding: 8, borderRadius: 8 }}>{a.message}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
              {isFarmer && a.status === 'pending' && (
                <>
                  <Text onPress={() => !busy && act(a.id, 'accepted')} style={{ color: colors.green, fontWeight: '700' }}>
                    Accept
                  </Text>
                  <Text onPress={() => !busy && act(a.id, 'rejected')} style={{ color: '#DC2626', fontWeight: '700' }}>
                    Reject
                  </Text>
                </>
              )}
              {!isFarmer && (a.status === 'pending' || a.status === 'accepted') && (
                <Text onPress={() => !busy && act(a.id, 'withdrawn')} style={{ color: '#DC2626', fontWeight: '700' }}>
                  Withdraw
                </Text>
              )}
              {a.job?.id ? (
                <Text onPress={() => router.push(`/job/${a.job!.id}`)} style={{ color: colors.green, fontWeight: '700' }}>
                  View job
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
