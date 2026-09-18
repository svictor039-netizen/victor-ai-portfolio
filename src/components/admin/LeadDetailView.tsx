import { useEffect, useState } from 'react';
import { ArrowLeft, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface Lead {
  id: number;
  lead_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  score: number;
  landing_page?: string;
  qualification_status: string;
  qualification_score: number;
  next_action: string;
  created_at: number;
  updated_at: number;
}

interface Props {
  leadId: string;
  onClose?: () => void;
}

export function LeadDetailView({ leadId, onClose }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetch(`/api/leads/?id=${encodeURIComponent(leadId)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (data.lead) setLead(data.lead);
        else if (Array.isArray(data)) {
          const found = data.find((l: Lead) => String(l.id) === leadId || l.lead_id === leadId);
          if (found) setLead(found);
        }
      })
      .catch(() => {});
  }, [leadId]);

  if (!lead) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
        <ArrowLeft size={18} onClick={onClose} className="cursor-pointer" />
        <span>Загрузка…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft size={18} /> Назад
          </button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{lead.name || '—'}</h2>
            <div className="text-sm text-muted-foreground mt-1">
              {lead.email || '—'} · {lead.phone || '—'} · {lead.company || '—'}
            </div>
          </div>
          <div className="text-sm">
            <span
              className={[
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                lead.status === 'contacted' ? 'bg-emerald-500/20 text-emerald-300' : lead.status === 'rejected' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300',
              ].join(' ')}
            >
              {lead.status === 'contacted' ? <><CheckCircle size={12} /> Обработан</> : lead.status === 'rejected' ? <><XCircle size={12} /> Отклонён</> : <><AlertTriangle size={12} /> Новый</>}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Lead ID</div>
            <div className="font-mono">{lead.lead_id}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Источник</div>
            <div>{lead.source}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Score</div>
            <div>{lead.score}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Landing page</div>
            <div>{lead.landing_page || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Квалификация</div>
            <div>{lead.qualification_status || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Квалиф. score</div>
            <div>{lead.qualification_score}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Следующее действие</div>
            <div>{lead.next_action || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Создан</div>
            <div>{new Date(lead.created_at * 1000).toLocaleString('ru-RU')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
