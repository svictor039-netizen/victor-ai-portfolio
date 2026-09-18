import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function AdminAuthGuard({ children }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/check/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => setAuthed(data.ok === true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-muted-foreground">Загрузка…</div>
      </div>
    );
  }

  if (!authed) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login/';
    }
    return null;
  }

  return <>{children}</>;
}
