import { screen } from '@testing-library/react';
import { adminIntegral, signedInBackend, stubApi } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

const revisor = {
  ...adminIntegral,
  permissions: [...adminIntegral.permissions, 'observations.create'],
};

/**
 * F2: mientras el servidor responda 404 en /dossiers, ninguna pantalla muestra un error en rojo
 * ni rutas de la API; solo el aviso neutro de módulo en preparación.
 */
test.each([
  ['Gestión documental', '/expedientes'],
  ['Búsqueda avanzada', '/busqueda'],
  ['Reportes', '/reportes'],
  ['Observaciones', '/observaciones'],
  ['Historial', '/historial'],
])('%s muestra «en preparación» sin errores ni textos técnicos', async (_nombre, ruta) => {
  stubApi({});
  renderApp(signedInBackend(revisor), ruta);
  expect(await screen.findByText(/está en preparación/)).toBeInTheDocument();
  expect(screen.queryByText(/no está disponible/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/GET \/|backend|contrato/i)).not.toBeInTheDocument();
});
