import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom no implementa canvas: los gráficos simplemente no dibujan en las pruebas.
HTMLCanvasElement.prototype.getContext = () => null;

afterEach(() => {
  cleanup();
});
