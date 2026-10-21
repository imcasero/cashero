import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from './app/Layout';
import { ComingSoon, More } from './app/pages';
import LoginForm from './LoginForm';
import { getApiKey, subscribeApiKey } from './lib/auth';
import Accounts from './pages/Accounts/Accounts';
import Budgets from './pages/Budgets/Budgets';
import Categories from './pages/Categories/Categories';
import Home from './pages/Home/Home';
import CloseResult from './pages/MonthClose/CloseResult';
import MonthClose from './pages/MonthClose/MonthClose';
import Movements from './pages/Movements/Movements';
import Surplus from './pages/Surplus/Surplus';
import Templates from './pages/Templates/Templates';

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
          <Route path="presupuestos" element={<Budgets />} />
          <Route path="recurrentes" element={<Templates />} />
          <Route path="reparto" element={<Surplus />} />
          <Route path="cierre" element={<MonthClose />} />
          <Route path="cierre/:month" element={<CloseResult />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="mas" element={<More />} />
          <Route path="*" element={<ComingSoon eyebrow="404" title="No encontrado" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
