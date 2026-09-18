import { useEffect, useState } from 'react';
import { Globe, CheckCircle, AlertTriangle } from 'lucide-react';

interface SeoPage {
  url: string;
  title: string;
  description: string;
  indexed: number;
  in_sitemap: number;
}

export function SeoAnalyzer() {
  const [pages, setPages] = useState<SeoPage[]>([]);

  useEffect(() => {
    fetch('/api/seo/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => setPages(data.pages || []))
      .catch(() => setPages([]));
  }, []);

  const totalIssues = pages.filter((p) => !p.in_sitemap).length;
  const indexedCount = pages.filter((p) => p.indexed).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <Globe size={20} className="text-primary" />
          <div>
            <div className="text-lg font-semibold">{pages.length}</div>
            <div className="text-xs text-muted-foreground">Страниц</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400" />
          <div>
            <div className="text-lg font-semibold">{indexedCount}</div>
            <div className="text-xs text-muted-foreground">Индексируются</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400" />
          <div>
            <div className="text-lg font-semibold">{totalIssues}</div>
            <div className="text-xs text-muted-foreground">Проблемы</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-raised text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">URL</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-left px-4 py-2 font-medium">Sitemap</th>
              <th className="text-left px-4 py-2 font-medium">Index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pages.map((p) => (
              <tr key={p.url} className="hover:bg-raised/50">
                <td className="px-4 py-3 font-mono text-xs">{p.url}</td>
                <td className="px-4 py-3">{p.title}</td>
                <td className="px-4 py-3">{p.in_sitemap ? <CheckCircle size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-amber-400" />}</td>
                <td className="px-4 py-3">{p.indexed ? <CheckCircle size={14} className="text-emerald-400" /> : <span className="text-muted-foreground text-xs">noindex</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
