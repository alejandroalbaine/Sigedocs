import { render, screen } from '@testing-library/react';
import { BadgeNotificacion } from './BadgeNotificacion.tsx';

test('el envío correcto muestra «Enviado»', () => {
  render(<BadgeNotificacion status="sent" />);
  expect(screen.getByText('Enviado')).toBeInTheDocument();
});

test('el envío pendiente muestra «Pendiente de envío»', () => {
  render(<BadgeNotificacion status="pending" />);
  expect(screen.getByText('Pendiente de envío')).toBeInTheDocument();
});

test('el envío fallido muestra «No se pudo enviar» sin exponer el motivo técnico', () => {
  const { container } = render(<BadgeNotificacion status="failed" />);
  expect(screen.getByText('No se pudo enviar')).toBeInTheDocument();
  expect(container.querySelector('span[title]')).toBeNull();
  expect(screen.queryByText(/SMTP/i)).not.toBeInTheDocument();
});

test('sin estado publicado el distintivo degrada a «En preparación»', () => {
  render(<BadgeNotificacion status="en_preparacion" />);
  expect(screen.getByText('En preparación')).toBeInTheDocument();
});
