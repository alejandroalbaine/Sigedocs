import type { RouteObject } from 'react-router';
import { RequireSession } from './common/auth/RequireSession.tsx';
import { DashboardPage } from './pages/Dashboard/DashboardPage.tsx';
import { HistorialPage } from './pages/Historial/HistorialPage.tsx';
import { AppLayout } from './pages/layout/AppLayout.tsx';
import { LoginPage } from './pages/Login/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFound/NotFoundPage.tsx';
import { ObservacionesPage } from './pages/Observaciones/ObservacionesPage.tsx';
import { RevisionPage } from './pages/Revision/RevisionPage.tsx';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireSession>
        <AppLayout />
      </RequireSession>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'revision', element: <RevisionPage /> },
      { path: 'observaciones', element: <ObservacionesPage /> },
      { path: 'historial', element: <HistorialPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
