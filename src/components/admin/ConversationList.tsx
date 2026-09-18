import { useEffect, useState } from 'react';
import { Bot, User } from 'lucide-react';

interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  session_id: string;
  messages: ConvMessage[];
  handoff?: Record<string, unknown>;
  model?: string;
  fallback?: number;
  error?: number;
  created_at: number;
}

export function ConversationList() {
  const [convs, setConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    fetch('/api/conversations/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => setConvs(data.conversations || []))
      .catch(() => setConvs([]));
  }, []);

  return (
    <div className="space-y-4">
      {convs.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          AI-диалогов пока нет.
        </div>
      )}
      {convs.map((conv) => (
        <div key={conv.id} className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-accent" />
              <span className="font-medium">{conv.model || 'AI Consultant'}</span>
              {conv.fallback ? <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">fallback</span> : null}
              {conv.error ? <span className="text-xs bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">error</span> : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {conv.created_at ? new Date(conv.created_at * 1000).toLocaleDateString('ru-RU') : '—'}
            </div>
          </div>

          <div className="space-y-2">
            {Array.isArray(conv.messages) && conv.messages.slice(-4).map((msg, i) => (
              <div key={i} className={['flex gap-2 text-sm', msg.role === 'user' ? 'text-foreground' : 'text-accent'].join(' ')}>
                <span className="shrink-0 mt-0.5">{msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}</span>
                <span className="line-clamp-2">{msg.content}</span>
              </div>
            ))}
            {Array.isArray(conv.messages) && conv.messages.length > 4 && (
              <div className="text-xs text-muted-foreground">+{conv.messages.length - 4} сообщений</div>
            )}
          </div>

          {conv.handoff && (
            <div className="bg-background rounded-lg p-3 text-sm border border-border">
              <div className="font-medium mb-1">Handoff</div>
              <div className="text-muted-foreground">{typeof conv.handoff === 'object' && conv.handoff !== null ? (conv.handoff as Record<string, string>).task || (conv.handoff as Record<string, string>).conversation_summary || '—' : '—'}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
