import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** Completa el formulario de acceso y lo envía. */
export async function iniciarSesion(email: string, password: string) {
  await userEvent.type(await screen.findByLabelText('Correo institucional'), email);
  await userEvent.type(screen.getByLabelText('Contraseña'), password);
  await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión segura/ }));
}
