import { useEffect, useState } from 'react';
import { Users, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';

interface Stats {
  totalLeads: number;
  todayLeads: number;
  totalConversations: number;
  avgScore: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, todayLeads: 0, totalConversations: 0, avgScore: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/leads/', { credentials: 'same-origin' }).then((r) => r.json()),
      fetch('/api/conversations/', { credentials: 'same-origin' }).then((r) => r.json()),
    ])
      .then(([leadsRes, convRes]) => {
        const leads = leadsRes.leads || [];
        const convs = convRes.conversations || [];
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = leads.filter((l: { created_at?: number }) => {
          if (!l.created_at) return false;
          return new Date(l.created_at * 1000).toISOString().slice(0, 10) === today;
        }).length;
        const scores = leads.map((l: { lead_score?: number }) => l.lead_score || 0).filter((s: number) => s > 0);
        const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        setStats({
          totalLeads: leads.length,
          todayLeads: todayCount,
          totalConversations: convs.length,
          avgScore: avg,
        });
      })
      .catch(() => {});
  }, []);

  const cards = [
    { label: 'Всего лидов', value: stats.totalLeads, icon: Users, color: 'text-primary' },
    { label: 'Сегодня', value: stats.todayLeads, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'AI-диалогов', value: stats.totalConversations, icon: MessageSquare, color: 'text-accent' },
    { label: 'Средний score', value: stats.avgScore, icon: AlertCircle, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={['p-3 rounded-lg bg-background', card.color].join(' ')}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-semibold">{card.value}</div>
              <div className="text-sm text-muted-foreground">{card.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
