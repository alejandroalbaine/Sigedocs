import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Alert, Button, DataTable, TextField } from './index.ts';

test('Button en carga se deshabilita y lo anuncia', () => {
  render(<Button loading>Guardar</Button>);
  const button = screen.getByRole('button', { name: 'Guardar' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
});

test('TextField vincula etiqueta, ayuda y error', () => {
  render(<TextField label="Correo" help="Use su cuenta" error="Correo inválido" />);
  const input = screen.getByLabelText('Correo');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Use su cuenta Correo inválido');
});

test('Alert de error usa role=alert y el resto role=status', () => {
  const { rerender } = render(<Alert kind="error">Falló</Alert>);
  expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  rerender(<Alert kind="success">Listo</Alert>);
  expect(screen.getByRole('status')).toHaveTextContent('Listo');
});

test('DataTable muestra el estado vacío y ordena por columna', async () => {
  const onSort = vi.fn();
  const columns = [
    { key: 'nombre', header: 'Nombre', render: (row: { id: string }) => row.id, sortable: true },
  ];
  const { rerender } = render(
    <DataTable
      caption="Usuarios"
      columns={columns}
      rows={[]}
      getRowKey={(row) => row.id}
      emptyMessage="Sin registros."
      sort={{ key: 'nombre', direction: 'asc' }}
      onSort={onSort}
    />,
  );
  expect(screen.getByText('Sin registros.')).toBeInTheDocument();
  expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');

  await userEvent.click(screen.getByRole('button', { name: /Nombre/ }));
  expect(onSort).toHaveBeenCalledWith('nombre');

  rerender(
    <DataTable
      caption="Usuarios"
      columns={columns}
      rows={[{ id: 'a' }, { id: 'b' }]}
      getRowKey={(row) => row.id}
      emptyMessage="Sin registros."
    />,
  );
  expect(screen.getAllByRole('row')).toHaveLength(3);
});
