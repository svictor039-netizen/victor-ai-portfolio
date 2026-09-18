import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Search,
  Activity,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const nav = [
  { label: 'Dashboard', href: '/admin/dashboard/', icon: LayoutDashboard },
  { label: 'Leads', href: '/admin/leads/', icon: Users },
  { label: 'Conversations', href: '/admin/conversations/', icon: MessageSquare },
  { label: 'SEO', href: '/admin/seo/', icon: Search },
  { label: 'System', href: '/admin/system/', icon: Activity },
];

async function logout() {
  try {
    await fetch('/api/auth/logout/', { method: 'POST', credentials: 'same-origin' });
  } catch {}
  window.location.href = '/admin/login/';
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');

  useEffect(() => {
    setCurrent(window.location.pathname);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-border text-foreground hover:bg-raised transition-colors"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed lg:static top-0 left-0 h-screen z-40 w-64 bg-surface border-r border-border flex flex-col transition-transform',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 text-accent font-semibold">
            <Shield size={20} />
            <span>Back Office</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Victor AI Portfolio</div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = current === item.href;
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-raised',
                ].join(' ')}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
