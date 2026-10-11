import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  listMessages,
  listMyConversations,
  sendMessage,
  type ChatMessage,
  type ConversationSummary,
} from '../lib/queries';
import { EmptyState, ErrorState, Spinner } from '../components/ui';

export default function Messages() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listMyConversations(user.id)
      .then(setConversations)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load conversations'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <Spinner label="Loading messages…" />;
  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />;

  // Mobile: show either list or thread. Desktop: two-pane.
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className={`${conversationId ? 'hidden lg:block' : ''}`}>
        <h1 className="mb-3 text-2xl font-bold text-brand-text">Messages</h1>
        {conversations.length === 0 ? (
          <EmptyState title="No conversations yet" description="Message a farmer from a job, or a labourer from an application." />
        ) : (
          <div className="aj-card divide-y divide-brand-border">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/app/messages/${c.id}`)}
                className={`flex w-full flex-col items-start gap-0.5 p-3 text-left hover:bg-brand-light/40 ${
                  c.id === conversationId ? 'bg-brand-light/60' : ''
                }`}
              >
                <span className="text-sm font-medium">{c.other_user?.full_name ?? 'Conversation'}</span>
                {c.job_title && <span className="text-xs text-brand-green">{c.job_title}</span>}
                {c.last_message && <span className="line-clamp-1 text-xs text-brand-muted">{c.last_message}</span>}
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className={`${!conversationId ? 'hidden lg:block' : ''}`}>
        {conversationId ? (
          <Thread conversationId={conversationId} myId={user!.id} onBack={() => navigate('/app/messages')} />
        ) : (
          <div className="hidden h-full items-center justify-center rounded-2xl border border-dashed border-brand-border text-sm text-brand-muted lg:flex">
            Select a conversation
          </div>
        )}
      </section>
    </div>
  );
}

function Thread({ conversationId, myId, onBack }: { conversationId: string; myId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      setMessages(await listMessages(conversationId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void refresh();
    // Lightweight polling (not server-push). Keeps the thread reasonably fresh.
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, myId, body);
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="aj-card flex h-[70vh] flex-col">
      <div className="flex items-center gap-2 border-b border-brand-border p-3">
        <button className="lg:hidden" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold">Conversation</h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-brand-muted">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-brand-green text-white' : 'bg-brand-light text-brand-text'
                  }`}
                >
                  {m.body}
                  <span className={`mt-1 block text-[10px] ${mine ? 'text-white/70' : 'text-brand-muted'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="flex items-center gap-2 border-t border-brand-border p-3" onSubmit={send}>
        <input className="aj-input" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="aj-btn-primary px-4" disabled={sending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
