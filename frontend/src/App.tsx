import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from './app/Layout';
import { ComingSoon, More } from './app/pages';
import LoginForm from './LoginForm';
import { getApiKey, subscribeApiKey } from './lib/auth';
import Accounts from './pages/Accounts/Accounts';
import Home from './pages/Home/Home';
import Movements from './pages/Movements/Movements';

function App() {
  const apiKey = useSyncExternalStore(subscribeApiKey, getApiKey);
  const queryClient = useQueryClient();

  // Never keep the previous session's data once the key is gone.
  useEffect(() => {
    if (!apiKey) queryClient.clear();
  }, [apiKey, queryClient]);

  if (!apiKey) return <LoginForm />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="movimientos" element={<Movements />} />
          <Route path="cuentas" element={<Accounts />} />
          <Route
            path="presupuestos"
            element={<ComingSoon eyebrow="Presupuestos" title="Presupuestos" />}
          />
          <Route
            path="recurrentes"
            element={<ComingSoon eyebrow="Recurrentes" title="Plantillas periódicas" />}
          />
          <Route
            path="reparto"
            element={<ComingSoon eyebrow="Reparto del sobrante" title="Reparto del sobrante" />}
          />
          <Route
            path="cierre"
            element={<ComingSoon eyebrow="Cierre de mes" title="Cerrar un mes" />}
          />
          <Route
            path="categorias"
            element={<ComingSoon eyebrow="Categorías" title="Categorías" />}
          />
          <Route path="mas" element={<More />} />
          <Route path="*" element={<ComingSoon eyebrow="404" title="No encontrado" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
