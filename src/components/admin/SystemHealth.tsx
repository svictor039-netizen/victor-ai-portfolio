import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Integration {
  name: string;
  display_name: string;
  configured: number;
  healthy: number;
  environment: string;
  last_check?: number;
  last_error?: string;
}

interface LogEntry {
  id: number;
  source: string;
  level: string;
  message: string;
  created_at: number;
}

export function SystemHealth() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/system/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data.integrations || []);
        setLogs(data.logs || []);
      })
      .catch(() => {});
  }, []);

  const allHealthy = integrations.length > 0 && integrations.every((s) => s.configured);

  return (
    <div className="space-y-6">
      <div className={['rounded-xl p-5 border flex items-center gap-4', allHealthy ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'].join(' ')}>
        <div className={allHealthy ? 'text-emerald-400' : 'text-amber-400'}>
          {allHealthy ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
        </div>
        <div>
          <div className="font-medium">{allHealthy ? 'Все интеграции настроены' : 'Требуется настройка интеграций'}</div>
          <div className="text-sm text-muted-foreground">
            {integrations.filter((s) => s.configured).length} из {integrations.length} настроено
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-raised text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Интеграция</th>
              <th className="text-left px-4 py-2 font-medium">Среда</th>
              <th className="text-left px-4 py-2 font-medium">Статус</th>
              <th className="text-left px-4 py-2 font-medium">Примечание</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {integrations.map((s) => (
              <tr key={s.name} className="hover:bg-raised/50">
                <td className="px-4 py-3 font-medium">{s.display_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.environment || '—'}</td>
                <td className="px-4 py-3">
                  <span className={['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', s.configured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'].join(' ')}>
                    {s.configured ? <><CheckCircle size={12} /> Настроено</> : <><XCircle size={12} /> Не настроено</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.last_error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Логи</h3>
        <div className="font-mono text-xs text-muted-foreground space-y-1">
          {logs.length === 0 && <div>Логов пока нет.</div>}
          {logs.map((log) => (
            <div key={log.id}>
              [{new Date(log.created_at * 1000).toLocaleTimeString('ru-RU')}] <span className={log.level === 'error' ? 'text-rose-400' : log.level === 'warn' ? 'text-amber-400' : ''}>{log.level}</span>: {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
