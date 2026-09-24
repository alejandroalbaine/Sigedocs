import { createBrowserRouter, RouterProvider } from 'react-router';
import { SessionProvider } from './common/auth/SessionProvider.tsx';
import { routes } from './router.tsx';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
