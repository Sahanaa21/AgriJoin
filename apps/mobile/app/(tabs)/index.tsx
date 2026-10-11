import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { greeting, type ApplicationWithRelations, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../../lib/auth';
import {
  listApplicationsForMyJobs,
  listMyApplications,
  listMyJobs,
  listOpenJobs,
} from '../../lib/queries';
import { JobCard } from '../../components/JobCard';
import { Badge, Button, Card, Empty, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function Dashboard() {
  const { profile, userId, role } = useAuth();
  const router = useRouter();
  const isFarmer = role === 'farmer';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [apps, setApps] = useState<ApplicationWithRelations[]>([]);
  const [stats, setStats] = useState({ a: 0, b: 0 });

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      if (isFarmer) {
        const [myJobs, myApps] = await Promise.all([listMyJobs(userId), listApplicationsForMyJobs(userId)]);
        setJobs(myJobs.slice(0, 3));
        setApps(myApps.slice(0, 4));
        setStats({ a: myJobs.filter((j) => j.status === 'open').length, b: myApps.filter((x) => x.status === 'pending').length });
      } else {
        const [open, myApps] = await Promise.all([listOpenJobs(null), listMyApplications(userId)]);
        setJobs(open.slice(0, 3));
        setApps(myApps.slice(0, 4));
        setStats({ a: myApps.length, b: myApps.filter((x) => x.status === 'accepted' || x.status === 'completed').length });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, isFarmer]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <Loading label="Loading…" />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={{ backgroundColor: isFarmer ? colors.green : colors.accent, borderRadius: 16, padding: 18 }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{greeting()},</Text>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '800' }}>{profile?.full_name}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
          {profile?.district}, {profile?.state}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.green }}>{stats.a}</Text>
          <Text style={{ color: colors.muted }}>{isFarmer ? 'Active jobs' : 'Applied'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>{stats.b}</Text>
          <Text style={{ color: colors.muted }}>{isFarmer ? 'Pending' : 'Accepted'}</Text>
        </Card>
      </View>

      {isFarmer && (
        <View style={{ marginTop: 14 }}>
          <Button title="+ Post a Job" onPress={() => router.push('/post-job')} />
        </View>
      )}

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 10 }}>
        {isFarmer ? 'Recent jobs' : 'Nearby jobs'}
      </Text>
      {jobs.length === 0 ? (
        <Empty title={isFarmer ? 'No jobs posted yet' : 'No open jobs right now'} description={isFarmer ? 'Post your first job to start receiving applications.' : 'Check back soon.'} />
      ) : (
        jobs.map((j) => <JobCard key={j.id} job={j} />)
      )}

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 10, marginBottom: 10 }}>Recent applications</Text>
      {apps.length === 0 ? (
        <Empty title="Nothing yet" />
      ) : (
        apps.map((a) => (
          <Card key={a.id} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{isFarmer ? a.labourer?.full_name ?? 'Labourer' : a.job?.title ?? 'Job'}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{isFarmer ? a.job?.title : `${a.job?.district} · ₹${a.job?.wage}/day`}</Text>
            </View>
            <Badge status={a.status} />
          </Card>
        ))
      )}
    </ScrollView>
  );
}
