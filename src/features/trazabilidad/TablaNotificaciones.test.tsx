import { render, screen, within } from '@testing-library/react';
import type { HistorialItem } from '../../types/trazabilidad.ts';
import { TablaNotificaciones } from './TablaNotificaciones.tsx';

function item(id: string, occurredAt: string, email: string): HistorialItem {
  return {
    notificationId: id,
    eventId: null,
    dossierId: 'd1',
    occurredAt,
    type: 'cambio',
    summary: null,
    versionLabel: null,
    estadoAnterior: null,
    estadoNuevo: null,
    destinatarios: [{ email, status: 'sent' }],
  };
}

test('D-13: las notificaciones se ordenan por fecha descendente, igual que la cronología', () => {
  render(
    <TablaNotificaciones
      vacio="Sin datos"
      items={[
        item('n1', '2026-10-01T10:00:00.000Z', 'antigua@uapa.edu'),
        item('n3', '2026-10-03T10:00:00.000Z', 'reciente@uapa.edu'),
        item('n2', '2026-10-02T10:00:00.000Z', 'media@uapa.edu'),
      ]}
    />,
  );
  const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  const correos = filas.map((fila) => within(fila).getByText(/@uapa\.edu$/).textContent);
  expect(correos).toEqual(['reciente@uapa.edu', 'media@uapa.edu', 'antigua@uapa.edu']);
});
