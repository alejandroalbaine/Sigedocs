import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BadgeNotificacion,
  DestinatariosNotificacion,
  NotificacionEvento,
} from './BadgeNotificacion.tsx';
import type { NotificacionCorreo } from './catalogos.ts';
import { EVENTOS_SIMULADOS } from './datosSimulados.ts';

const ENVIADO: NotificacionCorreo = {
  estado: 'enviado',
  destinatarios: ['docente@uapa.edu.do', 'direccion@uapa.edu.do'],
};

test('el envío correcto muestra distintivo verde y los dos destinatarios', () => {
  render(<NotificacionEvento notificacion={ENVIADO} />);
  expect(screen.getByText('Enviado')).toBeInTheDocument();
  expect(screen.getByText('docente@uapa.edu.do')).toBeVisible();
  expect(screen.getByText('direccion@uapa.edu.do')).toBeVisible();
});

test('el envío pendiente muestra «Pendiente de envío» con sus destinatarios', () => {
  render(
    <NotificacionEvento
      notificacion={{ estado: 'pendiente', destinatarios: ['docente@uapa.edu.do'] }}
    />,
  );
  expect(screen.getByText('Pendiente de envío')).toBeInTheDocument();
  expect(screen.getByText('docente@uapa.edu.do')).toBeVisible();
});

test('el envío fallido muestra «No se pudo enviar» y el error como texto emergente y leído por lector de pantalla', () => {
  const { container } = render(
    <BadgeNotificacion
      notificacion={{
        estado: 'fallido',
        destinatarios: ['docente@uapa.edu.do'],
        detalleError: 'SMTP 550: dirección rechazada.',
      }}
    />,
  );
  expect(screen.getByText('No se pudo enviar')).toBeInTheDocument();
  const distintivo = container.querySelector('span[title]');
  expect(distintivo).toHaveAttribute('title', 'SMTP 550: dirección rechazada.');
  expect(screen.getByText(/SMTP 550: dirección rechazada\./)).toHaveClass('visually-hidden');
});

test('sin detalle de envío el distintivo degrada a «En preparación»', () => {
  const { rerender } = render(<BadgeNotificacion />);
  expect(screen.getByText('En preparación')).toBeInTheDocument();

  rerender(<BadgeNotificacion notificacion={null} />);
  expect(screen.getByText('En preparación')).toBeInTheDocument();

  rerender(<BadgeNotificacion notificacion={{ estado: 'en_preparacion', destinatarios: [] }} />);
  expect(screen.getByText('En preparación')).toBeInTheDocument();
});

test('«En preparación» no inventa destinatarios', () => {
  render(
    <DestinatariosNotificacion
      notificacion={{ estado: 'en_preparacion', destinatarios: ['docente@uapa.edu.do'] }}
    />,
  );
  expect(screen.queryByText('docente@uapa.edu.do')).not.toBeInTheDocument();
  expect(screen.getByText('El detalle del envío aún no está disponible.')).toBeInTheDocument();
});

test('más de dos destinatarios se resumen en un desplegable', async () => {
  render(
    <DestinatariosNotificacion
      notificacion={{
        estado: 'enviado',
        destinatarios: ['a@uapa.edu.do', 'b@uapa.edu.do', 'c@uapa.edu.do', 'd@uapa.edu.do'],
      }}
    />,
  );
  expect(screen.getByText('a@uapa.edu.do')).toBeVisible();
  expect(screen.getByText('b@uapa.edu.do')).toBeVisible();
  expect(screen.getByText('c@uapa.edu.do')).not.toBeVisible();

  const resumen = screen.getByText('+2 más');
  expect(resumen.closest('details')).not.toHaveAttribute('open');
  await userEvent.click(resumen);
  expect(screen.getByText('c@uapa.edu.do')).toBeVisible();
  expect(screen.getByText('d@uapa.edu.do')).toBeVisible();
});

test('los datos simulados cubren los tres estados de envío', () => {
  const estados = EVENTOS_SIMULADOS.map(
    (evento) => evento.notificacion?.estado ?? 'en_preparacion',
  );
  expect(estados).toContain('enviado');
  expect(estados).toContain('fallido');
  expect(estados).toContain('en_preparacion');
  expect(EVENTOS_SIMULADOS.some((evento) => evento.notificacion === undefined)).toBe(true);
});
