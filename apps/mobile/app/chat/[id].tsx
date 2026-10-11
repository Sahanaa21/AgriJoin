import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { listMessages, sendMessage, type ChatMessage } from '../../lib/queries';
import { Loading } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function refresh() {
    if (!id) return;
    try {
      setMessages(await listMessages(id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // Lightweight polling (not server-push). Keeps the thread fresh.
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [id]);

  async function send() {
    const body = draft.trim();
    if (!body || !id || !userId) return;
    setSending(true);
    try {
      const msg = await sendMessage(id, userId, body);
      setMessages((p) => [...p, msg]);
      setDraft('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {messages.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 20 }}>No messages yet. Say hello 👋</Text>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8 }}>
                <View style={{ backgroundColor: mine ? colors.green : colors.white, borderWidth: mine ? 0 : 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: mine ? colors.white : colors.text }}>{m.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
        />
        <Pressable onPress={send} disabled={sending || !draft.trim()} style={{ backgroundColor: colors.green, borderRadius: 20, paddingHorizontal: 18, justifyContent: 'center' }}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}
