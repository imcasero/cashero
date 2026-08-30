import { useCallback, useEffect, useState } from 'react';
import { getHealth } from './lib/api';
import { env } from './lib/env';

type Connection =
  | { state: 'loading' }
  | { state: 'ok'; status: string }
  | { state: 'error'; message: string };

function App() {
  const [connection, setConnection] = useState<Connection>({ state: 'loading' });

  const check = useCallback((signal?: AbortSignal) => {
    setConnection({ state: 'loading' });

    getHealth(signal)
      .then((health) => setConnection({ state: 'ok', status: health.status }))
      .catch((error: unknown) => {
        if (signal?.aborted) return;
        setConnection({
          state: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    check(controller.signal);
    return () => controller.abort();
  }, [check]);

  return (
    <main className="app">
      <header>
        <h1>Cashero</h1>
        <p className="subtitle">React + Vite conectado a la API de FastAPI.</p>
      </header>

      <section className="card">
        <div className="card-header">
          <h2>Estado del backend</h2>
          <span className={`badge badge-${connection.state}`}>
            {connection.state === 'loading' && 'Comprobando...'}
            {connection.state === 'ok' && connection.status}
            {connection.state === 'error' && 'Sin conexion'}
          </span>
        </div>

        <dl>
          <dt>API</dt>
          <dd>
            <code>{env.apiUrl}</code>
          </dd>
          <dt>Endpoint</dt>
          <dd>
            <code>GET /health</code>
          </dd>
        </dl>

        {connection.state === 'error' && <p className="error">{connection.message}</p>}

        <button type="button" onClick={() => check()}>
          Reintentar
        </button>
      </section>
    </main>
  );
}

export default App;
