import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistance, formatWage, type JobWithFarmer } from '@agrijoin/shared';
import { Badge } from './ui';
import { colors } from '../lib/theme';

export function JobCard({ job }: { job: JobWithFarmer }) {
  const router = useRouter();
  const distance = formatDistance(job.distance_km);
  return (
    <Pressable
      onPress={() => router.push(`/job/${job.id}`)}
      style={{ backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            {job.title} <Text style={{ fontWeight: '400', color: colors.muted }}>— {job.category}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{job.farmer_name}</Text>
        </View>
        <Badge status={job.status} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 12 }}>
        <Text style={{ color: colors.deep, fontWeight: '700' }}>{formatWage(job.wage, job.wage_unit)}</Text>
        <Text style={{ color: colors.muted }}>📍 {job.locality}, {job.district}</Text>
        {distance ? <Text style={{ color: colors.muted }}>🧭 {distance}</Text> : null}
      </View>
      <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
        👥 {job.workers_needed} workers · {job.start_date} → {job.end_date}
      </Text>
    </Pressable>
  );
}
