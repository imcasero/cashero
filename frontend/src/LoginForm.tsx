import { type FormEvent, useState } from 'react';
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
    <form className="card" onSubmit={handleSubmit}>
      <h2>Clave de acceso</h2>
      <input
        type="password"
        autoComplete="current-password"
        aria-label="Clave de acceso"
        value={key}
        onChange={(event) => setKey(event.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={pending || !key.trim()}>
        {pending ? 'Comprobando...' : 'Entrar'}
      </button>
    </form>
  );
}

export default LoginForm;
