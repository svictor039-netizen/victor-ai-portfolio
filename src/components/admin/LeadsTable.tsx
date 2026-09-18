import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { LeadRecord } from '../../lib/db';

interface Props {
  onSelectLead?: (leadId: string) => void;
}

export function LeadsTable({ onSelectLead }: Props) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status) params.set('status', status);
    params.set('sort', sort);
    params.set('order', order);
    fetch(`/api/leads/?${params.toString()}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.leads)) setLeads(data.leads);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, [query, status, sort, order]);

  const handleDelete = (id: string) => {
    if (!confirm('Удалить лид?')) return;
    setDeletingId(id);
    fetch(`/api/leads/?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) refresh();
      })
      .finally(() => setDeletingId(null));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Поиск по имени, email, телефону, компании…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="">Все статусы</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="unqualified">Unqualified</option>
          <option value="consulting">Consulting</option>
          <option value="automation">Automation</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="created_at">По дате</option>
          <option value="score">По score</option>
          <option value="name">По имени</option>
        </select>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="desc">↓ Убывание</option>
          <option value="asc">↑ Возрастание</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-raised text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">ID</th>
              <th className="text-left px-4 py-2 font-medium">Имя</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Компания</th>
              <th className="text-left px-4 py-2 font-medium">Источник</th>
              <th className="text-left px-4 py-2 font-medium">Статус</th>
              <th className="text-left px-4 py-2 font-medium">Score</th>
              <th className="text-left px-4 py-2 font-medium">Создан</th>
              <th className="text-left px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">Нет лидов.</td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-raised/50 cursor-pointer group"
                onClick={() => onSelectLead?.(String(lead.id))}
              >
                <td className="px-4 py-3 font-mono text-muted-foreground">{String(lead.id)}</td>
                <td className="px-4 py-3 font-medium">{lead.name || '—'}</td>
                <td className="px-4 py-3">{lead.email || '—'}</td>
                <td className="px-4 py-3">{lead.company || '—'}</td>
                <td className="px-4 py-3">{lead.source || '—'}</td>
                <td className="px-4 py-3">
                  <span className={['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    lead.qualification_status === 'hot' ? 'bg-rose-500/20 text-rose-300' :
                    lead.qualification_status === 'warm' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-500/20 text-slate-300'
                  ].join(' ')}>
                    {lead.qualification_status || 'new'}
                  </span>
                </td>
                <td className="px-4 py-3">{lead.score}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(lead.created_at * 1000).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    title="Удалить"
                    onClick={(e) => { e.stopPropagation(); handleDelete(String(lead.id)); }}
                    className="text-muted-foreground hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  {deletingId === String(lead.id) && <span className="ml-2 text-muted-foreground text-xs">…</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
