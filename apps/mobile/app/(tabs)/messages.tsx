import { useCallback, useState } from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { listMyConversations, type ConversationSummary } from '../../lib/queries';
import { Card, Empty, Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function MessagesTab() {
  const { userId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setItems(await listMyConversations(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {items.length === 0 ? (
        <Empty title="No conversations yet" description="Message a farmer from a job, or a labourer from an application." />
      ) : (
        items.map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/chat/${c.id}`)}>
            <Card style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{c.other_user?.full_name ?? 'Conversation'}</Text>
              {c.job_title ? <Text style={{ color: colors.green, fontSize: 13 }}>{c.job_title}</Text> : null}
              {c.last_message ? (
                <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                  {c.last_message}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
