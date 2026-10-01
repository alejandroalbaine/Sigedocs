import type { RouteObject } from 'react-router';
import { RequirePermission } from './common/auth/RequirePermission.tsx';
import { RequireSession } from './common/auth/RequireSession.tsx';
import { DashboardPage } from './pages/Dashboard/DashboardPage.tsx';
import { HistorialPage } from './pages/Historial/HistorialPage.tsx';
import { AppLayout } from './pages/layout/AppLayout.tsx';
import { LoginPage } from './pages/Login/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFound/NotFoundPage.tsx';
import { ObservacionesPage } from './pages/Observaciones/ObservacionesPage.tsx';
import { RevisionPage } from './pages/Revision/RevisionPage.tsx';
import { BusquedaPage } from './pages/Busqueda/BusquedaPage.tsx';
import { GestionPage } from './pages/Gestion/GestionPage.tsx';
import { RegistroPage } from './pages/Registro/RegistroPage.tsx';
import { ReportesPage } from './pages/Reportes/ReportesPage.tsx';
import { UsuariosPage } from './pages/Usuarios/UsuariosPage.tsx';
import { UiKitPage } from './pages/UiKit/UiKitPage.tsx';

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
      {
        path: 'expedientes',
        element: (
          <RequirePermission permission="dossiers.read" action="consultar expedientes">
            <GestionPage />
          </RequirePermission>
        ),
      },
      {
        path: 'expedientes/nuevo',
        element: (
          <RequirePermission permission="dossiers.create" action="registrar expedientes">
            <RegistroPage />
          </RequirePermission>
        ),
      },
      {
        path: 'busqueda',
        element: (
          <RequirePermission permission="dossiers.read" action="buscar expedientes">
            <BusquedaPage />
          </RequirePermission>
        ),
      },
      { path: 'revision', element: <RevisionPage /> },
      { path: 'observaciones', element: <ObservacionesPage /> },
      { path: 'historial', element: <HistorialPage /> },
      {
        path: 'reportes',
        element: (
          <RequirePermission permission="audit.read" action="consultar reportes">
            <ReportesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <RequirePermission permission="users.manage" action="administrar usuarios y roles">
            <UsuariosPage />
          </RequirePermission>
        ),
      },
      {
        path: 'ui-kit',
        element: (
          <RequirePermission permission="templates.manage" action="consultar la biblioteca UI">
            <UiKitPage />
          </RequirePermission>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
