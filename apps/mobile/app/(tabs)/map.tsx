import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { formatDistance, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../../lib/auth';
import { listMyJobs, listOpenJobs } from '../../lib/queries';
import { useLocation } from '../../lib/useLocation';
import { JobCard } from '../../components/JobCard';
import { Button, Card, Empty, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

/**
 * Mobile "Live Map" — honest list-based job discovery.
 *
 * An interactive native map (react-native-maps) needs a custom Expo dev build
 * and a Google Maps API key, which Expo Go cannot provide. Rather than show a
 * fake/static map image, we present the same job data as a distance-sorted
 * list. See docs for the dev-build upgrade path. The website uses Leaflet for
 * the full interactive map.
 */
export default function MapTab() {
  const { userId, role } = useAuth();
  const isFarmer = role === 'farmer';
  const loc = useLocation();
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setJobs(isFarmer ? await listMyJobs(userId) : await listOpenJobs(loc.coords));
    } finally {
      setLoading(false);
    }
  }, [userId, isFarmer, loc.coords]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const mapped = jobs.filter((j) => j.lat != null && j.lng != null);
  const sorted = [...mapped].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ marginBottom: 14, backgroundColor: colors.light, borderColor: colors.border }}>
        <Text style={{ color: colors.deep, fontWeight: '700' }}>Nearby jobs</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
          {mapped.length} {isFarmer ? 'of your jobs' : 'open jobs'} have a location. This list is sorted by distance when
          you share your location. The full interactive map is on the AgriJoin website.
        </Text>
        {!loc.coords && (
          <View style={{ marginTop: 10 }}>
            <Button title="Use my location" variant="ghost" onPress={loc.request} />
          </View>
        )}
        {loc.status === 'denied' && (
          <Text style={{ color: '#92400E', fontSize: 12, marginTop: 8 }}>Location denied — jobs still show, without distances.</Text>
        )}
      </Card>

      {sorted.length === 0 ? (
        <Empty title="No mapped jobs" description="Jobs without coordinates still appear in the Browse list." />
      ) : (
        sorted.map((j) => (
          <View key={j.id}>
            {j.distance_km != null && (
              <Text style={{ color: colors.accent, fontSize: 12, marginBottom: 2 }}>{formatDistance(j.distance_km)}</Text>
            )}
            <JobCard job={j} />
          </View>
        ))
      )}
    </ScrollView>
  );
}
