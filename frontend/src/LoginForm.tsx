import { type FormEvent, useState } from 'react';
import { Card } from './components/Card';
import { Logo } from './components/Logo';
import { verifyApiKey } from './lib/api';
import { setApiKey } from './lib/auth';

function LoginForm() {
  const [key, setKey] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const candidate = key.trim();
    if (!candidate) return;

    setPending(true);
    setError(null);

    try {
      if (await verifyApiKey(candidate)) {
        setApiKey(candidate);
        return;
      }
      setError('Clave incorrecta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
    setPending(false);
  }

  return (
    <main className="grid min-h-svh place-items-center px-4">
      <Card className="flex w-full max-w-[420px] flex-col gap-5 p-6">
        <Logo />
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-2">
            Clave de acceso
            <input
              type="password"
              autoComplete="current-password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="h-12 rounded-control border border-line bg-sunken px-3 text-[16px] font-normal text-text"
            />
          </label>
          {error && <p className="text-[13px] text-negative">{error}</p>}
          <button
            type="submit"
            disabled={pending || !key.trim()}
            className="h-12 rounded-control bg-accent font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Comprobando...' : 'Entrar'}
          </button>
        </form>
      </Card>
    </main>
  );
}

export default LoginForm;
